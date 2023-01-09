// Package server handles the GraphQL HTTP server.
package server

import (
	"context"
	"io"
	"io/ioutil"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/empiricaly/empirica/internal/lobbies"
	"github.com/empiricaly/empirica/internal/templates"
	"github.com/empiricaly/empirica/internal/treatments"
	"github.com/go-playground/validator/v10"
	"github.com/jpillora/backoff"
	jsoniter "github.com/json-iterator/go"
	"github.com/julienschmidt/httprouter"
	"github.com/pkg/errors"
	"github.com/rs/cors"
	"github.com/rs/zerolog/log"
	"gopkg.in/yaml.v3"
)

var json = jsoniter.ConfigCompatibleWithStandardLibrary

// Server holds the server state.
type Server struct {
	wg     *sync.WaitGroup
	Router *httprouter.Router
	config *Config
}

// shutdownGracePeriod is the time to wait for the server to close gracefully.
const shutdownGracePeriod = 5 * time.Second

// Start creates and starts the GraphQL HTTP server.
func Start(
	ctx context.Context,
	config *Config,
) (*Server, error) {
	s, err := Prepare(config)
	if err != nil {
		return nil, errors.Wrap(err, "prepare server")
	}

	if err := Enable(ctx, config, s.Router); err != nil {
		return nil, errors.Wrap(err, "enable server")
	}

	if err := s.Start(ctx); err != nil {
		return nil, errors.Wrap(err, "start server")
	}

	return s, nil
}

// Start creates and starts the GraphQL HTTP server.
func (s *Server) Start(ctx context.Context) (err error) {
	srv := &http.Server{
		Addr:        s.config.Addr,
		Handler:     cors.AllowAll().Handler(s.Router),
		BaseContext: func(_ net.Listener) context.Context { return ctx },
	}

	s.wg.Add(1)

	ctx2, cancel := context.WithTimeout(ctx, 100*time.Millisecond)
	defer cancel()

	go func() {
		log.Debug().Str("addr", s.config.Addr).Msg("server: starting")

		<-ctx.Done()

		// Give time for node to close gracefully.
		time.Sleep(time.Second)

		log.Debug().Msg("server: stopping")
		s.wg.Add(1)

		shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownGracePeriod)
		defer cancel()

		err := srv.Shutdown(shutdownCtx)
		if err != nil {
			log.Error().Err(err).Msg("server: shutdown failed")

			os.Exit(1)

			return
		}

		log.Debug().Msg("server: gracefully shutdown")
		s.wg.Done()
	}()

	go func() {
		lerr := srv.ListenAndServe()
		if lerr != nil && !errors.Is(lerr, http.ErrServerClosed) {
			err = lerr

			cancel()
		}

		log.Debug().Msg("server: shutdown")
		s.wg.Done()
	}()

	<-ctx2.Done()

	if err != nil {
		return errors.Wrap(err, "start server")
	}

	return nil
}

// Prepare prepares the HTTP server.
func Prepare(config *Config) (*Server, error) {
	s := &Server{
		wg:     &sync.WaitGroup{},
		Router: httprouter.New(),
		config: config,
	}

	s.Router.RedirectTrailingSlash = true
	s.Router.RedirectFixedPath = true
	s.Router.HandleMethodNotAllowed = true

	return s, nil
}

// Wait for the server to close.
func (s *Server) Wait() {
	s.wg.Wait()
}

func Enable(
	ctx context.Context,
	config *Config,
	router *httprouter.Router,
) error {
	u, err := url.Parse(config.ProxyAddr)
	if err != nil {
		return errors.Wrap(err, "parse proxy address")
	}

	router.GET("/", index(u.Scheme, u.Host))

	prox := httputil.NewSingleHostReverseProxy(u)
	prox.ErrorHandler = func(rw http.ResponseWriter, req *http.Request, err error) {
		rw.WriteHeader(http.StatusBadGateway)
	}
	router.NotFound = prox

	router.GET("/dev", DevCheck(config.Production))
	router.GET("/treatments", ReadTreatments(config.Treatments))
	router.PUT("/treatments", WriteTreatments(config.Treatments))
	router.GET("/lobbies", ReadLobbies(config.Lobbies))
	router.PUT("/lobbies", WriteLobbies(config.Lobbies))
	router.ServeFiles("/admin/*filepath", templates.HTTPFS("admin-ui"))

	return nil
}

func index(scheme, host string) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		u, err := url.Parse(r.URL.String())
		if err != nil {
			log.Error().Err(err).Msg("server: send response for index failed")

			w.WriteHeader(http.StatusInternalServerError)

			return
		}

		connRetry := &backoff.Backoff{
			Min:    50 * time.Millisecond,
			Max:    2 * time.Second,
			Factor: 1.1,
			Jitter: true,
		}

		u.Scheme = scheme
		u.Host = host

		forwardIndexReq(u, connRetry, w, r)
	}
}

func forwardIndexReq(u *url.URL, connRetry *backoff.Backoff, w http.ResponseWriter, r *http.Request) {
	req := &http.Request{
		Method: r.Method,
		URL:    u,
		Header: r.Header,
		Body:   r.Body,
	}

	defer r.Body.Close()

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		handleIndexErr(err, u, connRetry, w, r)

		return
	}

	defer res.Body.Close()

	for k, vs := range res.Header {
		for _, v := range vs {
			w.Header().Add(k, v)
		}
	}

	w.WriteHeader(res.StatusCode)

	if _, err := io.Copy(w, res.Body); err != nil {
		log.Error().Err(err).Msg("server: send response for index failed")
	}
}

func handleIndexErr(err error, u *url.URL, connRetry *backoff.Backoff, w http.ResponseWriter, r *http.Request) {
	var errType string

	switch t := err.(type) {
	case *net.OpError:
		if t.Op == "dial" {
			errType = "unknown host"
		} else if t.Op == "read" {
			errType = "connection refused"
		}
	case syscall.Errno:
		if t == syscall.ECONNREFUSED {
			errType = "connection refused"
		}
	case net.Error:
		if t.Timeout() {
			errType = "timeout"
		} else {
			// In case of net error, the vite server is not ready yet, retry.
			// errType = "net error"

			select {
			case <-time.After(connRetry.Duration()):
				forwardIndexReq(u, connRetry, w, r)
			case <-r.Context().Done():
			}

			return
		}
	}

	log.Error().Err(err).Str("type", errType).Msg("server: send response for index failed")
	w.WriteHeader(http.StatusInternalServerError)
}

func DevCheck(isProd bool) httprouter.Handle {
	return func(w http.ResponseWriter, _ *http.Request, _ httprouter.Params) {
		if isProd {
			w.WriteHeader(http.StatusBadRequest)
		} else {
			w.WriteHeader(http.StatusOK)
		}
	}
}

// TODO sercure these endpoints
func ReadTreatments(p string) httprouter.Handle {
	return func(w http.ResponseWriter, _ *http.Request, _ httprouter.Params) {
		content, err := ioutil.ReadFile(p)
		if err != nil {
			log.Error().Err(err).Msg("Failed to open yaml")
		}

		t := &treatments.Treatments{}

		err = yaml.Unmarshal(content, &t)
		if err != nil {
			log.Error().Err(err).Msg("Failed read yaml")
		}

		if err := validator.New().Struct(t); err != nil {
			log.Error().Err(err).Msg("Failed to parse treatments.yaml")

			w.WriteHeader(http.StatusUnprocessableEntity)
			_, _ = w.Write([]byte(err.Error()))

			return
		}

		contentJSON, err := json.Marshal(t)
		if err != nil {
			log.Error().Err(err).Msg("Failed write json")
		}

		_, err = w.Write(contentJSON)
		if err != nil {
			log.Error().Err(err).Msg("Failed to send response for index")
		}
	}
}

func WriteTreatments(p string) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		b, err := ioutil.ReadAll(r.Body)
		if err != nil {
			log.Error().Err(err).Msg("Failed read json")
		}

		r.Body.Close()

		t := &treatments.Treatments{}
		if err := json.Unmarshal(b, &t); err != nil {
			log.Error().Err(err).Msg("Failed write json")
		}

		if err := validator.New().Struct(t); err != nil {
			log.Error().Err(err).Msg("Failed to parse treatments.yaml")

			w.WriteHeader(http.StatusUnprocessableEntity)
			_, _ = w.Write([]byte(err.Error()))

			return
		}

		content, err := yaml.Marshal(t)
		if err != nil {
			log.Error().Err(err).Msg("Failed write yaml")
		}

		err = ioutil.WriteFile(p, content, 0o644)
		if err != nil {
			log.Error().Err(err).Msg("Failed to open yaml")
		}
	}
}

// TODO sercure these endpoints
func ReadLobbies(p string) httprouter.Handle {
	return func(w http.ResponseWriter, _ *http.Request, _ httprouter.Params) {
		content, err := ioutil.ReadFile(p)
		if err != nil {
			log.Error().Err(err).Msg("Failed to open yaml")
		}

		t := &lobbies.Lobbies{}

		err = yaml.Unmarshal(content, &t)
		if err != nil {
			log.Error().Err(err).Msg("Failed read yaml")
		}

		if err := validator.New().Struct(t); err != nil {
			log.Error().Err(err).Msg("Failed to parse lobbies.yaml")

			w.WriteHeader(http.StatusUnprocessableEntity)

			val := struct {
				Errors []string `json:"errors"`
			}{
				Errors: strings.Split(err.Error(), "\n"),
			}

			if b, err := json.Marshal(val); err == nil {
				_, _ = w.Write(b)
			}

			return
		}

		contentJSON, err := json.Marshal(t)
		if err != nil {
			log.Error().Err(err).Msg("Failed write json")
		}

		_, err = w.Write(contentJSON)
		if err != nil {
			log.Error().Err(err).Msg("Failed to send response for index")
		}
	}
}

func WriteLobbies(p string) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		b, err := ioutil.ReadAll(r.Body)
		if err != nil {
			log.Error().Err(err).Msg("Failed read json")
		}

		r.Body.Close()

		t := &lobbies.Lobbies{}
		if err := json.Unmarshal(b, &t); err != nil {
			log.Error().Err(err).Msg("Failed write json")
		}

		if err := validator.New().Struct(t); err != nil {
			log.Error().Err(err).Msg("Failed to parse lobbies.yaml")

			w.WriteHeader(http.StatusUnprocessableEntity)
			_, _ = w.Write([]byte(err.Error()))

			return
		}

		content, err := yaml.Marshal(t)
		if err != nil {
			log.Error().Err(err).Msg("Failed write yaml")
		}

		err = ioutil.WriteFile(p, content, 0o644)
		if err != nil {
			log.Error().Err(err).Msg("Failed to open yaml")
		}
	}
}
