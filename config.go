package empirica

import (
	"github.com/empiricaly/empirica/internal/callbacks"
	"github.com/empiricaly/empirica/internal/player"
	"github.com/empiricaly/empirica/internal/server"
	logger "github.com/empiricaly/empirica/internal/utils/log"
	"github.com/empiricaly/tajriba"
	"github.com/pkg/errors"
	"github.com/spf13/cobra"
)

// Config is server configuration.
type Config struct {
	Server    *server.Config    `mapstructure:"server"`
	Player    *player.Config    `mapstructure:"player"`
	Callbacks *callbacks.Config `mapstructure:"callbacks"`
	Tajriba   *tajriba.Config   `mapstructure:"tajriba"`
	Log       *logger.Config    `mapstructure:"log"`
}

// Validate configuration is ok.
func (c *Config) Validate() error {
	if err := c.Server.Validate(); err != nil {
		return errors.Wrap(err, "validate server configuration")
	}

	if err := c.Player.Validate(); err != nil {
		return errors.Wrap(err, "validate player configuration")
	}

	if err := c.Callbacks.Validate(); err != nil {
		return errors.Wrap(err, "validate callbacks configuration")
	}

	if err := c.Tajriba.Validate(); err != nil {
		return errors.Wrap(err, "validate tajriba configuration")
	}

	if err := c.Log.Validate(); err != nil {
		return errors.Wrap(err, "validate log configuration")
	}

	return nil
}

// ConfigFlags helps configure cobra and viper flags.
func ConfigFlags(cmd *cobra.Command) error {
	if cmd == nil {
		return errors.New("command required")
	}

	if err := server.ConfigFlags(cmd, "server"); err != nil {
		return errors.Wrap(err, "set server configuration flags")
	}

	if err := player.ConfigFlags(cmd, "player"); err != nil {
		return errors.Wrap(err, "set player configuration flags")
	}

	if err := callbacks.ConfigFlags(cmd, "callbacks"); err != nil {
		return errors.Wrap(err, "set callbacks configuration flags")
	}

	if err := tajriba.ConfigFlags(cmd, "tajriba"); err != nil {
		return errors.Wrap(err, "set tajriba configuration flags")
	}

	if err := logger.ConfigFlags(cmd, "log", "info"); err != nil {
		return errors.Wrap(err, "set logger configuration flags")
	}

	return nil
}
