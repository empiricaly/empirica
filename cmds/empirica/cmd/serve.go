package cmd

import (
	"os"

	"github.com/empiricaly/empirica"
	"github.com/empiricaly/empirica/internal/bundle"
	"github.com/empiricaly/empirica/internal/settings"
	"github.com/pkg/errors"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

func addServeCommand(parent *cobra.Command) error {
	cmd := &cobra.Command{
		Use:   "serve [bundle]",
		Short: "Serve bundle in production mode",
		// 	Long: ``,
		SilenceUsage:  true,
		SilenceErrors: true,
		Args:          cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if len(args) != 1 {
				return errors.New("missing project name")
			}

			conf := getConfig(true)

			ctx := initContext()

			clean, err := cmd.Flags().GetBool("clean")
			if err != nil {
				return errors.Wrap(err, "parse clean flag")
			}

			addr, err := cmd.Flags().GetString("addr")
			if err != nil {
				return errors.Wrap(err, "parse addr flag")
			}

			devMode, err := cmd.Flags().GetBool("dev")
			if err != nil {
				return errors.Wrap(err, "parse dev flag")
			}

			if err := settings.InstallVoltaIfNeeded(ctx); err != nil {
				return errors.Wrap(err, "check node")
			}

			in := args[0]

			conf.Server.Addr = addr

			return bundle.Serve(ctx, conf, in, clean, devMode)
		},
	}

	cmd.Flags().Bool("clean", false, "cleanup old installation")

	// HACK: conflicting args between 2 calls, same flags. cobra/viper "bug"?
	if len(os.Args) < 2 || os.Args[1] != "serve" {
		parent.AddCommand(cmd)

		return nil
	}

	flag := "addr"
	sval := ":3000"
	cmd.Flags().String(flag, sval, "Address of the server")
	viper.SetDefault(flag, sval)

	flag = "dev"
	bval := false
	cmd.Flags().Bool(flag, bval, "Start in dev mode (no auth)")
	viper.SetDefault(flag, bval)

	if err := empirica.ConfigFlags(cmd); err != nil {
		return errors.Wrap(err, "define flags")
	}

	if err := viper.BindPFlags(cmd.Flags()); err != nil {
		return errors.Wrap(err, "bind serve flags")
	}

	if err := viper.BindPFlags(cmd.PersistentFlags()); err != nil {
		return errors.Wrap(err, "bind persistent serve flags")
	}

	parent.AddCommand(cmd)

	return nil
}
