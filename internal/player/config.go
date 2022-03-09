package player

import (
	"github.com/pkg/errors"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

const (
	defaultDevCommand   = "yarn run --silent dev"
	defaultBuildCommand = "yarn run --silent build"
	// defaultServeCommand = ""
	defaultBuildDir = "dist"
)

// Config is server configuration.
type Config struct {
	Path     string `mapstructure:"path"`
	DevCmd   string `mapstructure:"devcmd"`
	BuildCmd string `mapstructure:"buildcmd"`
	// ServeCmd string `mapstructure:"servecmd"`
	BuildDir string `mapstructure:"builddir"`
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
	cmd.Flags().String(flag, sval, "Path to code")
	viper.SetDefault(flag, sval)

	flag = prefix + ".devcmd"
	sval = defaultDevCommand
	cmd.Flags().String(flag, sval, "Command to run code in development")
	viper.SetDefault(flag, sval)

	flag = prefix + ".buildcmd"
	sval = defaultBuildCommand
	cmd.Flags().String(flag, sval, "Command to build code for production")
	viper.SetDefault(flag, sval)

	// flag = prefix + ".servecmd"
	// sval = defaultServeCommand
	// cmd.Flags().String(flag, sval, "Command to run code in production")
	// viper.SetDefault(flag, sval)

	flag = prefix + ".builddir"
	sval = defaultBuildDir
	cmd.Flags().String(flag, sval, "Build directory")
	viper.SetDefault(flag, sval)

	return nil
}
