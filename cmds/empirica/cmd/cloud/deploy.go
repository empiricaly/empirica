package cloudcmd

import (
	"os"
	"path"

	"github.com/empiricaly/empirica/internal/bundle"
	"github.com/empiricaly/empirica/internal/settings"
	"github.com/pkg/errors"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

const randPkgNameLen = 10

func AddDeployCommand(parent *cobra.Command) error {
	cmd := &cobra.Command{
		Use:           "deploy",
		Short:         "Deploy project to Empirica Cloud",
		SilenceUsage:  true,
		SilenceErrors: true,
		Hidden:        true,
		Args:          cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			return nil
			ctx := initContext()

			out := path.Join(os.TempDir(), randSeq(randPkgNameLen)) + ".zstd"

			conf := getConfig()

			if err := settings.InstallVoltaIfNeeded(ctx); err != nil {
				return errors.Wrap(err, "check node")
			}

			err := bundle.Bundle(ctx, conf, out, false)
			if err != nil {
				return errors.Wrap(err, "bundle project")
			}

			return nil
		},
	}

	cmd.Flags().Bool("gzip", false, "use gzip")
	cmd.Flags().String("domain", "", "defaults to durrent dir")

	err := viper.BindPFlags(cmd.Flags())
	if err != nil {
		return errors.Wrap(err, "bind bundle flags")
	}

	parent.AddCommand(cmd)

	return nil
}
