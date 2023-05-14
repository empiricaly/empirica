package cmd

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/empiricaly/empirica/internal/settings"
	logger "github.com/empiricaly/empirica/internal/utils/log"
	"github.com/empiricaly/tajriba"
	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

func addTajribaCommand(parent *cobra.Command) error {
	cmd := &cobra.Command{
		Use:   "tajriba",
		Short: "Run standalone tajriba server",
		// 	Long: ``,
		SilenceUsage:  true,
		SilenceErrors: true,
		Args:          cobra.NoArgs,
		Hidden:        true,
		RunE: func(cmd *cobra.Command, args []string) error {
			if err := settings.InstallVoltaIfNeeded(initContext()); err != nil {
				return errors.Wrap(err, "install volta")
			}

			econf := getConfig()

			err := logger.Init(econf.Log)
			if err != nil {
				return errors.Wrap(err, "init logs")
			}

			conf := econf.Tajriba

			if err := conf.Validate(); err != nil {
				log.Fatal().Err(err).Msg("invalid config")
			}

			ctx, cancel := context.WithCancel(context.Background())

			go func() {
				s := make(chan os.Signal, 1)
				signal.Notify(s, syscall.SIGINT, syscall.SIGTERM, syscall.SIGQUIT, syscall.SIGHUP)
				<-s
				cancel()

				s = make(chan os.Signal, 1)
				signal.Notify(s, syscall.SIGINT, syscall.SIGTERM, syscall.SIGQUIT)
				<-s
				log.Fatal().Msg("Force quit")
			}()

			t, err := tajriba.Start(ctx, conf, false)
			if err != nil {
				log.Fatal().Err(err).Msg("failed starting tajriba")
			}

			log.Info().Msg("tajriba: started")

			<-ctx.Done()

			// Give the closing a few seconds to cleanup
			ctx, cancel = context.WithTimeout(context.Background(), closeMaxCuration)
			defer cancel()

			t.Close()

			return nil
		},
	}

	if len(os.Args) > 1 && os.Args[1] == "tajriba" {
		err := tajriba.ConfigFlags(cmd, "tajriba", "tajriba.json")
		if err != nil {
			return errors.Wrap(err, "define flags")
		}

		err = viper.BindPFlags(cmd.Flags())
		if err != nil {
			return errors.Wrap(err, "bind root flags")
		}

		err = viper.BindPFlags(cmd.PersistentFlags())
		if err != nil {
			return errors.Wrap(err, "bind root flags")
		}
	}

	parent.AddCommand(cmd)

	return nil
}
