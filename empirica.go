package empirica

import (
	"context"

	"github.com/99designs/gqlgen/graphql"
	"github.com/empiricaly/empirica/internal/callbacks"
	"github.com/empiricaly/empirica/internal/player"
	"github.com/empiricaly/empirica/internal/server"
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

	r := &Runner{}

	var schema graphql.ExecutableSchema

	ctx, r.taj, schema, err = tajriba.Setup(ctx, config.Tajriba, usingConfigFile)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to start tajriba")
	}

	r.server, err = server.Start(ctx, config.Server)
	if err != nil {
		return nil, errors.Wrap(err, "init server")
	}

	r.player, err = player.Start(ctx, config.Player)
	if err != nil {
		return nil, errors.Wrap(err, "init player")
	}

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
