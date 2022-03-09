package bundle

import (
	"context"
	"net/http"
	"os"
	"os/exec"
	"path"
	"strings"

	"github.com/empiricaly/empirica"
	"github.com/empiricaly/empirica/internal/server"
	"github.com/empiricaly/empirica/internal/templates"
	"github.com/empiricaly/tajriba"
	"github.com/julienschmidt/httprouter"
	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
)

func Serve(ctx context.Context, config *empirica.Config, in string, clean bool) error {
	dir, err := Unbundle(ctx, config, in, clean)
	if err != nil {
		return errors.Wrap(err, "unbundle")
	}

	go func() {
		parts := strings.Split(config.Callbacks.ServeCmd, " ")
		if len(parts) == 0 {
			log.Error().Msg("callbacks: empty serve command")

			return
		}

		var args []string
		if len(parts) > 1 {
			args = parts[1:]
		}

		c := exec.CommandContext(ctx, parts[0], args...)

		p := path.Join(dir, "callbacks")

		os.Chdir(p)

		c.Stderr = os.Stderr
		c.Stdout = os.Stdout
		c.Dir = path.Join(dir, "callbacks")

		if err := c.Start(); err != nil {
			log.Error().Err(err).Msg("callbacks: failed serve command")

			return
		}

		log.Info().Msg("callbacks: started")

		if err := c.Wait(); err != nil {
			if strings.Contains(err.Error(), "signal: killed") {
				log.Debug().Msg("callback: restarting")

				return
			}

			log.Error().Err(err).Msg("callbacks: failed serve command")
		}
	}()

	s, err := server.Prepare(config.Server)
	if err != nil {
		return errors.Wrap(err, "prepare server")
	}

	playerFS := http.FileServer(http.Dir(path.Join(dir, "player")))

	s.Router.GET("/", func(w http.ResponseWriter, req *http.Request, ps httprouter.Params) {
		playerFS.ServeHTTP(w, req)
	})
	s.Router.NotFound = playerFS

	s.Router.GET("/treatments", server.ReadTreatments(config.Server.Treatments))
	s.Router.PUT("/treatments", server.WriteTreatments(config.Server.Treatments))
	s.Router.ServeFiles("/admin/*filepath", templates.HTTPFS("admin-ui"))

	ctx, taj, schema, err := tajriba.Setup(ctx, config.Tajriba, false)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to start tajriba")
	}
	defer taj.Close(ctx)

	err = tajriba.Init(ctx, config.Tajriba, schema, s.Router)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to start tajriba")
	}

	// adminFS := http.FileServer(templates.HTTPFS("admin-ui"))
	// playerFS := http.FileServer(http.Dir(path.Join(dir, "player")))

	// getTreatments := server.ReadTreatments(config.Server.Treatments)

	// s.Router.GET("/*filepath", func(w http.ResponseWriter, req *http.Request, ps httprouter.Params) {
	// 	fp := ps.ByName("filepath")

	// 	if fp == "/treatments" {
	// 		getTreatments(w, req, ps)
	// 		return
	// 	}

	// 	isAdmin := strings.HasPrefix(fp, "/admin")
	// 	if isAdmin {
	// 		fp = strings.TrimPrefix(fp, "/admin")
	// 	}

	// 	req.URL.Path = fp
	// 	if isAdmin {
	// 		adminFS.ServeHTTP(w, req)
	// 	} else {
	// 		playerFS.ServeHTTP(w, req)
	// 	}
	// })

	// s.Router.PUT("/treatments", server.WriteTreatments(config.Server.Treatments))

	if err := s.Start(ctx); err != nil {
		return errors.Wrap(err, "start server")
	}

	log.Info().
		Msg("empirica: server started")

	s.Wait()

	return nil
}
