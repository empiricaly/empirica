package log

import (
	"github.com/pkg/errors"
	"github.com/rs/zerolog"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

// Config configures the logger.
type Config struct {
	Level    string `mapstructure:"level"`
	ForceTTY bool   `mapstructure:"tty"`
	JSON     bool   `mapstructure:"json"`
	ShowLine bool   `mapstructure:"line"`
}

// Validate configuration is ok.
func (c *Config) Validate() error {
	_, err := zerolog.ParseLevel(c.Level)
	if err != nil {
		return errors.Wrap(err, "parse log level")
	}

	return nil
}

// ConfigFlags helps configure cobra and viper flags.
func ConfigFlags(cmd *cobra.Command, prefix, defaultLevel string) error {
	if cmd == nil {
		return errors.New("command required")
	}

	if prefix == "" {
		return errors.New("prefix required")
	}

	if defaultLevel == "" {
		return errors.New("default level required")
	}

	viper.SetDefault(prefix, &Config{})

	flag := prefix + ".level"
	cmd.PersistentFlags().String(flag, defaultLevel, "Log level: trace, debug, info, warn, error, fatal or panic")
	viper.SetDefault(flag, defaultLevel)

	flag = prefix + ".tty"
	cmd.PersistentFlags().Bool(flag, false, "Force behavior of attached TTY (color, human output)")
	viper.SetDefault(flag, false)

	flag = prefix + ".json"
	cmd.PersistentFlags().Bool(flag, false, "Output JSON formatted logs (takes precedence over forcetty)")
	viper.SetDefault(flag, false)

	flag = prefix + ".line"
	cmd.PersistentFlags().Bool(flag, false, "Show file and line number of log call")
	viper.SetDefault(flag, false)

	return nil
}
