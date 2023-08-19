package bundle

import (
	"context"
	"net/http"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"strings"

	"github.com/empiricaly/empirica"
	"github.com/empiricaly/empirica/internal/build"
	"github.com/empiricaly/empirica/internal/server"
	"github.com/empiricaly/empirica/internal/templates"
	"github.com/empiricaly/tajriba"
	"github.com/julienschmidt/httprouter"
	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
)

func Serve(ctx context.Context, config *empirica.Config, in string, clean, devMode bool) error {
	dir, conf, err := Unbundle(ctx, config, in, clean, devMode)
	if err != nil {
		return errors.Wrap(err, "unbundle")
	}

	log.Trace().
		Interface("dir", dir).
		Interface("config", config).
		Msg("serve: current config")

	if err := conf.Validate(); err != nil {
		log.Fatal().Err(err).Msg("invalid config")
	}

	go func(ctx context.Context) {
		parts := strings.Split(conf.Callbacks.ServeCmd, " ")
		if len(parts) == 0 {
			log.Error().Msg("callbacks: empty serve command")

			return
		}

		var args []string
		cmd := parts[0]
		if len(parts) > 1 {
			if parts[0] == "npm" {
				cmd = "empirica"
				args = parts
			} else {
				args = parts[1:]
			}
		}

		args = append(args, "--token", conf.Callbacks.Token)

		addr := conf.Server.Addr
		if strings.HasPrefix(addr, ":") {
			addr = "http://localhost" + addr + "/query"
		}
		args = append(args, "--url", addr)

		if conf.Callbacks.SessionToken != "" {
			p := conf.Callbacks.SessionToken
			if !strings.HasPrefix(p, "/") {
				pp, err := filepath.Abs(p)
				if err == nil {
					p = pp
				}
			}
			args = append(args, "--sessionTokenPath", p)
		}

		log.Debug().
			Str("cmd", strings.Join(append([]string{cmd}, args...), " ")).
			Msg("serve: start server command")

		c := exec.CommandContext(ctx, cmd, args...)

		p := path.Join(dir, "callbacks")

		c.Stderr = os.Stderr
		c.Stdout = os.Stdout
		c.Dir = p

		if err := c.Start(); err != nil {
			log.Error().Err(err).Msg("serve: failed server command")

			return
		}

		log.Info().Msg("serve: server started")

		if err := c.Wait(); err != nil {
			if strings.Contains(err.Error(), "signal: killed") {
				log.Debug().Msg("serve: restarting server")

				return
			}

			log.Error().Err(err).Msg("serve: failed server command")
		}
	}(ctx)

	s, err := server.Prepare(conf.Server)
	if err != nil {
		return errors.Wrap(err, "prepare server")
	}

	playerFS := http.FileServer(http.Dir(path.Join(dir, "player")))

	s.Router.GET("/", func(w http.ResponseWriter, req *http.Request, ps httprouter.Params) {
		playerFS.ServeHTTP(w, req)
	})

	s.Router.NotFound = playerFS

	s.Router.GET("/dev", server.DevCheck(conf.Production))
	s.Router.GET("/treatments", server.ReadTreatments(conf.Server.Treatments))
	s.Router.PUT("/treatments", server.WriteTreatments(conf.Server.Treatments))
	s.Router.GET("/lobbies", server.ReadLobbies(conf.Server.Lobbies))
	s.Router.PUT("/lobbies", server.WriteLobbies(conf.Server.Lobbies))
	s.Router.ServeFiles("/admin/*filepath", templates.HTTPFS("admin-ui"))

	ctx, taj, schema, err := tajriba.Setup(ctx, conf.Tajriba, false)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to start tajriba")
	}
	defer taj.Close()

	err = taj.Init(schema, s.Router)
	if err != nil {
		return errors.Wrap(err, "init tajriba")
	}

	if err := s.Start(ctx); err != nil {
		return errors.Wrap(err, "start server")
	}

	bver, err := build.VersionJSON()
	if err != nil {
		log.Error().Err(err).Msg("serve: failed to get build version")
	}

	log.Info().
		RawJSON("build", bver).
		Msg("tajriba: server started")

	s.Wait()

	return nil
}
