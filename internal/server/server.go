// Package server handles the GraphQL HTTP server.
package server

import (
	"context"
	"net"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/julienschmidt/httprouter"
	"github.com/pkg/errors"
	"github.com/rs/cors"
	"github.com/rs/zerolog/log"
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

	go func() {
		log.Debug().Str("addr", config.Addr).Msg("Started Tajriba server")

		<-ctx.Done()

		log.Debug().Msg("Stopping Tajriba server")
		s.wg.Add(1)

		shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownGracePeriod)
		defer cancel()

		err := srv.Shutdown(shutdownCtx)
		if err != nil {
			log.Error().Err(err).Msg("Tajriba server shutdown failed")

			os.Exit(1)

			return
		}

		log.Debug().Msg("Tajriba server gracefully shutdown")
		s.wg.Done()
	}()

	go func() {
		err := srv.ListenAndServe()
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error().Err(err).Msg("Failed start Tajriba server")
		}

		s.wg.Done()
	}()

	return s, nil
}

// Close closes the server.
func (s *Server) Close() {
	s.wg.Wait()
}

// Enable adds Tajriba GraphQL endpoints to an HTTP router.
func Enable(
	ctx context.Context,
	_ *Config,
	router *httprouter.Router,
) error {
	router.GET("/", index)

	return nil
}

func index(w http.ResponseWriter, _ *http.Request, _ httprouter.Params) {
	_, err := w.Write([]byte("Hello!"))
	if err != nil {
		log.Error().Err(err).Msg("Failed to send response for index")
	}
}
