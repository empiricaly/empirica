package cmd

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/empiricaly/empirica"
	"github.com/empiricaly/empirica/internal/settings"
	logger "github.com/empiricaly/empirica/internal/utils/log"
	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

func defineRoot() (*cobra.Command, *bool, error) {
	// usingConfigFile tracks if the config comes from a file.
	isUsingConfigFile := false
	usingConfigFile := &isUsingConfigFile

	// cmd represents the base command when called without any subcommands.
	cmd := &cobra.Command{
		Use:   "empirica",
		Short: "empirica is an engine for multiplayer interactive experiments",
		// Long: ``,
		SilenceUsage:  true,
		SilenceErrors: true,
		Args:          cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			return root(cmd, args, usingConfigFile)
		},
	}

	err := empirica.ConfigFlags(cmd)
	if err != nil {
		return nil, nil, errors.Wrap(err, "define flags")
	}

	cmd.PersistentFlags().String("config", "", "config file (default is .empirica/empirica.toml)")

	err = viper.BindPFlags(cmd.Flags())
	if err != nil {
		return nil, nil, errors.Wrap(err, "bind root flags")
	}

	err = viper.BindPFlags(cmd.PersistentFlags())
	if err != nil {
		return nil, nil, errors.Wrap(err, "bind root persistent flags")
	}

	return cmd, usingConfigFile, nil
}

const closeMaxCuration = time.Second * 5

func root(_ *cobra.Command, _ []string, usingConfigFile *bool) error {
	ctx := initContext()

	if err := settings.InstallVoltaIfNeeded(ctx); err != nil {
		return errors.Wrap(err, "check node")
	}

	conf := getConfig()

	t, err := empirica.Start(ctx, conf, *usingConfigFile)
	if err != nil {
		return errors.Wrap(err, "failed to start")
	}

	<-ctx.Done()

	// Give the closing a few seconds to cleanup
	ctx, cancel := context.WithTimeout(context.Background(), closeMaxCuration)
	defer cancel()

	t.Close(ctx)

	log.Debug().Msg("empirica: stopped")

	return nil
}

func failedStart(err error) {
	if err != nil {
		log.Fatal().Err(err).Msg("empirica: failed to start")
	}
}

// Execute adds all child commands to the root command and sets flags appropriately.
// This is called by main.main(). It only needs to happen once to the rootCmd.
func Execute() {
	settings.InitShared()

	rootCmd, usingConfigFile, err := defineRoot()
	if err != nil {
		failedStart(err)
	}

	failedStart(addCreateCommand(rootCmd))
	failedStart(addBundleCommand(rootCmd))
	failedStart(addServeCommand(rootCmd))
	failedStart(addSetupCommand(rootCmd))
	failedStart(addNodeCommand(rootCmd))
	failedStart(addYarnCommand(rootCmd))
	failedStart(addUpgradeCommand(rootCmd))

	cobra.OnInitialize(initConfig(rootCmd, usingConfigFile))

	if err := rootCmd.Execute(); err != nil {
		failedStart(err)
	}
}

// initConfig reads in config file and ENV variables if set.
func initConfig(rootCmd *cobra.Command, usingConfigFile *bool) func() {
	return func() {
		cfgFile, err := rootCmd.PersistentFlags().GetString("config")
		if err != nil {
			log.Fatal().Err(err).Msg("empirica: failed to parse config file flag")
		}

		if cfgFile != "" {
			// Use config file from the flag.
			viper.SetConfigFile(cfgFile)
		} else {
			// Find home directory.
			// home, err := homedir.Dir()
			// if err != nil {
			// 	log.Error().Err(err).Msg("Getting $HOME dir")
			// 	os.Exit(1)
			// }

			// Search config in home directory with name ".empirica" (without extension).
			// viper.AddConfigPath(".")
			// viper.AddConfigPath("./empirica")
			viper.AddConfigPath("./.empirica")
			// viper.AddConfigPath(home)
			viper.SetConfigName("empirica")
		}

		viper.AutomaticEnv() // read in environment variables that match

		// If a config file is found, read it in.
		if err := viper.ReadInConfig(); err == nil {
			*usingConfigFile = true
		}

		conf := getConfig()

		if err := logger.Init(conf.Log); err != nil {
			log.Fatal().Err(err).Msg("empirica: failed to init logging")
		}
	}
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
