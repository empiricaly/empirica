package server

import (
	"fmt"

	"github.com/empiricaly/empirica/internal/settings"
	"github.com/pkg/errors"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

// Config is server configuration.
type Config struct {
	Addr       string `mapstructure:"addr"`
	Treatments string `mapstructure:"treatments"`
	Lobbies    string `mapstructure:"lobbies"`

	// Player frontend proxy
	ProxyAddr string `mapstructure:"proxyaddr"`

	Production bool `mapstructure:"-"`
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

	flag := prefix + ".addr"
	sval := ":3000"
	cmd.Flags().StringP(flag, "s", sval, "Address of the server")
	viper.SetDefault(flag, sval)

	flag = prefix + ".treatments"
	sval = fmt.Sprintf("%s/treatments.yaml", settings.EmpiricaDir)
	cmd.Flags().String(flag, sval, "Treatments config file")
	viper.SetDefault(flag, sval)

	flag = prefix + ".lobbies"
	sval = fmt.Sprintf("%s/lobbies.yaml", settings.EmpiricaDir)
	cmd.Flags().String(flag, sval, "Lobbies config file")
	viper.SetDefault(flag, sval)

	flag = prefix + ".proxyaddr"
	sval = "http://127.0.0.1:8844"
	cmd.Flags().String(flag, sval, "Frontend proxy address")
	viper.SetDefault(flag, sval)

	return nil
}
