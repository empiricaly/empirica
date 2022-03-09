package cmd

import (
	"github.com/empiricaly/empirica/internal/settings"
	"github.com/pkg/errors"
	"github.com/spf13/cobra"
)

func addYarnCommand(parent *cobra.Command) error {
	cmd := &cobra.Command{
		Use:   "yarn",
		Short: "Run yarn commands",
		// 	Long: ``,
		SilenceUsage:  true,
		SilenceErrors: true,
		// Args:               cobra.An,
		Hidden:             true,
		DisableFlagParsing: true,
		TraverseChildren:   true,
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := initContext()

			if err := settings.InstallVoltaIfNeeded(ctx); err != nil {
				return errors.Wrap(err, "check node")
			}

			return runCmd(ctx, "", "yarn", args...)
		},
	}

	parent.AddCommand(cmd)

	return nil
}
