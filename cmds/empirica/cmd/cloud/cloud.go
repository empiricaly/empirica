package cloudcmd

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/empiricaly/empirica"
	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

func AddCloudCommand(parent *cobra.Command) error {
	cmd := &cobra.Command{
		Use:           "cloud",
		Short:         "Empirica Cloud services",
		Long:          `Empirica Cloud is a set of services to help you run your experiment.`,
		SilenceUsage:  true,
		SilenceErrors: true,
		Hidden:        true,
		Args:          cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			cmd.Usage()

			return nil
		},
	}

	err := viper.BindPFlags(cmd.Flags())
	if err != nil {
		return errors.Wrap(err, "bind bundle flags")
	}

	err = AddDeployCommand(cmd)
	if err != nil {
		return errors.Wrap(err, "add deploy command")
	}

	err = AddSigninCommand(cmd)
	if err != nil {
		return errors.Wrap(err, "add signin command")
	}

	parent.AddCommand(cmd)

	return nil
}

func initContext() context.Context {
	ctx, cancel := context.WithCancel(context.Background())

	go func() {
		s := make(chan os.Signal, 1)
		signal.Notify(s, syscall.SIGINT, syscall.SIGTERM, syscall.SIGQUIT, syscall.SIGHUP)
		<-s
		cancel()

		s = make(chan os.Signal, 1)
		signal.Notify(s, syscall.SIGINT, syscall.SIGTERM, syscall.SIGQUIT)
		<-s
		log.Fatal().Msg("empirica: force quit")
	}()

	return ctx
}

func getConfig(validate ...bool) *empirica.Config {
	conf := new(empirica.Config)

	if err := viper.Unmarshal(conf); err != nil {
		log.Fatal().Err(err).Msg("could not parse configuration")
	}

	if len(validate) > 0 && validate[0] {
		if err := conf.Validate(); err != nil {
			log.Fatal().Err(err).Msg("invalid config")
		}
	}

	return conf
}
