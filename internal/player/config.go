package player

import (
	"github.com/pkg/errors"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

// Config is server configuration.
type Config struct {
	Path   string `mapstructure:"path"`
	DevCmd string `mapstructure:"devcmd"`
}

// Validate configuration is ok.
func (c *Config) Validate() error {
	return nil
}

// ConfigFlags helps configure cobra and viper flags.
func ConfigFlags(cmd *cobra.Command, prefix string) error {
	if cmd == nil {
		return errors.New("command required")
	}

	if prefix == "" {
		return errors.New("prefix required")
	}

	viper.SetDefault(prefix, &Config{})

	flag := prefix + ".path"
	sval := "client"
	cmd.Flags().String(flag, sval, "Path to client code")
	viper.SetDefault(flag, sval)

	flag = prefix + ".devcmd"
	sval = "./node_modules/.bin/vite"
	cmd.Flags().String(flag, sval, "Command to run client code in development")
	viper.SetDefault(flag, sval)

	return nil
}
