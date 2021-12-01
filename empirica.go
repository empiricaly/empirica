package empirica

import (
	"context"
	"os"

	"github.com/99designs/gqlgen/graphql"
	"github.com/empiricaly/empirica/internal/callbacks"
	"github.com/empiricaly/empirica/internal/player"
	"github.com/empiricaly/empirica/internal/server"
	"github.com/empiricaly/empirica/internal/settings"
	logger "github.com/empiricaly/empirica/internal/utils/log"
	"github.com/empiricaly/tajriba"
	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
)

// Runner manages Empirica's running state.
type Runner struct {
	server    *server.Server
	player    *player.Player
	callbacks *callbacks.Callbacks
	taj       *tajriba.Runner
}

// Close waits for empirica to be done.
func (r *Runner) Close(ctx context.Context) {
	if r.server != nil {
		r.server.Close()
	}

	if r.taj != nil {
		r.taj.Close(ctx)
	}
}

// Start sets up the Empirica environment and creates an HTTP server.
func Start(ctx context.Context, config *Config, usingConfigFile bool) (*Runner, error) {
	err := logger.Init(config.Log)
	if err != nil {
		return nil, errors.Wrap(err, "init logs")
	}

	if usingConfigFile {
		log.Trace().Str("file", viper.ConfigFileUsed()).Msg("Using config file")
	}

	log.Trace().Interface("config", config).Msg("Configuration")

	dir, err := os.Getwd()
	if err != nil {
		return nil, errors.Wrap(err, "get current dir")
	}

	if err := settings.Init(dir); err != nil {
		return nil, errors.Wrap(err, "empirica")
	}

	r := &Runner{}

	var schema graphql.ExecutableSchema

	ctx, r.taj, schema, err = tajriba.Setup(ctx, config.Tajriba, usingConfigFile)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to start tajriba")
	}

	// Pass down if production
	config.Server.Production = config.Production

	r.server, err = server.Start(ctx, config.Server)
	if err != nil {
		return nil, errors.Wrap(err, "init server")
	}

	r.player, err = player.Start(ctx, config.Player)
	if err != nil {
		return nil, errors.Wrap(err, "init player")
	}

	config.Callbacks.Token = config.Tajriba.Auth.ServiceRegistrationToken
	config.Tajriba.Server.Production = config.Production

	r.callbacks, err = callbacks.Start(ctx, config.Callbacks)
	if err != nil {
		return nil, errors.Wrap(err, "init callbacks")
	}

	err = tajriba.Init(ctx, config.Tajriba, schema, r.server.Router)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to start tajriba")
	}

	return r, nil
}
