package cmd

import (
	"github.com/empiricaly/empirica/internal/bundle"
	"github.com/empiricaly/empirica/internal/settings"
	"github.com/pkg/errors"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

func addBundleCommand(parent *cobra.Command) error {
	cmd := &cobra.Command{
		Use:   "bundle",
		Short: "Bundle project",
		// 	Long: ``,
		SilenceUsage:  true,
		SilenceErrors: true,
		Args:          cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := initContext()

			useGzip, err := cmd.Flags().GetBool("gzip")
			if err != nil {
				return errors.Wrap(err, "parse gzip flag")
			}

			out, err := cmd.Flags().GetString("out")
			if err != nil {
				return errors.Wrap(err, "parse out flag")
			}

			conf := getConfig()

			if err := settings.InstallVoltaIfNeeded(ctx); err != nil {
				return errors.Wrap(err, "check node")
			}

			return bundle.Bundle(ctx, conf, out, useGzip)
		},
	}

	cmd.Flags().Bool("gzip", false, "use gzip")
	cmd.Flags().String("out", "", "defaults to current dir")

	err := viper.BindPFlags(cmd.Flags())
	if err != nil {
		return errors.Wrap(err, "bind bundle flags")
	}

	parent.AddCommand(cmd)

	return nil
}
