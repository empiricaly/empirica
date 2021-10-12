// Package server handles the GraphQL HTTP server.
package server

import (
	"context"
	"encoding/json"
	"io/ioutil"
	"net"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/julienschmidt/httprouter"
	"github.com/pkg/errors"
	"github.com/rs/cors"
	"github.com/rs/zerolog/log"
	"gopkg.in/yaml.v3"
)

// Server holds the server state.
type Server struct {
	wg     *sync.WaitGroup
	Router *httprouter.Router
}

// shutdownGracePeriod is the time to wait for the server to close gracefully.
const shutdownGracePeriod = 5 * time.Second

// Start creates and starts the GraphQL HTTP server.
func Start(
	ctx context.Context,
	config *Config,
) (*Server, error) {
	s := &Server{
		wg:     &sync.WaitGroup{},
		Router: httprouter.New(),
	}

	s.Router.RedirectTrailingSlash = true
	s.Router.RedirectFixedPath = true
	s.Router.HandleMethodNotAllowed = true

	err := Enable(ctx, config, s.Router)
	if err != nil {
		return nil, errors.Wrap(err, "enable server")
	}

	srv := &http.Server{
		Addr:        config.Addr,
		Handler:     cors.Default().Handler(s.Router),
		BaseContext: func(_ net.Listener) context.Context { return ctx },
	}

	s.wg.Add(1)

	ctx2, cancel := context.WithTimeout(ctx, 100*time.Millisecond)
	defer cancel()

	go func() {
		log.Debug().Str("addr", config.Addr).Msg("server: starting")

		<-ctx.Done()

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

		s.wg.Done()
	}()

	<-ctx2.Done()

	if err != nil {
		return nil, errors.Wrap(err, "start server")
	}

	return s, nil
}

// Close closes the server.
func (s *Server) Close() {
	s.wg.Wait()
}

func Enable(
	ctx context.Context,
	config *Config,
	router *httprouter.Router,
) error {
	router.GET("/", index)
	router.GET("/treatments", readTreatments(config.Treatments))
	router.PUT("/treatments", writeTreatments(config.Treatments))

	return nil
}

func index(w http.ResponseWriter, _ *http.Request, _ httprouter.Params) {
	_, err := w.Write([]byte("Hello!"))
	if err != nil {
		log.Error().Err(err).Msg("Failed to send response for index")
	}
}

func readTreatments(p string) httprouter.Handle {
	return func(w http.ResponseWriter, _ *http.Request, _ httprouter.Params) {
		content, err := ioutil.ReadFile(p)
		if err != nil {
			log.Error().Err(err).Msg("Failed to open yaml")
		}

		c := make(map[string]interface{})

		err = yaml.Unmarshal(content, &c)
		if err != nil {
			log.Error().Err(err).Msg("Failed read yaml")
		}

		contentJSON, err := json.Marshal(c)
		if err != nil {
			log.Error().Err(err).Msg("Failed write json")
		}

		_, err = w.Write(contentJSON)
		if err != nil {
			log.Error().Err(err).Msg("Failed to send response for index")
		}
	}
}

func writeTreatments(p string) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
		b, err := ioutil.ReadAll(r.Body)
		if err != nil {
			log.Error().Err(err).Msg("Failed read json")
		}
		r.Body.Close()

		c := make(map[string]interface{})
		err = json.Unmarshal(b, &c)
		if err != nil {
			log.Error().Err(err).Msg("Failed write json")
		}

		content, err := yaml.Marshal(c)
		if err != nil {
			log.Error().Err(err).Msg("Failed write yaml")
		}

		err = ioutil.WriteFile(p, content, 0644)
		if err != nil {
			log.Error().Err(err).Msg("Failed to open yaml")
		}
	}
}
