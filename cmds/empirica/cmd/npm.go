package cmd

import (
	"github.com/empiricaly/empirica/internal/experiment"
	"github.com/empiricaly/empirica/internal/settings"
	"github.com/pkg/errors"
	"github.com/spf13/cobra"
)

func addNPMCommand(parent *cobra.Command) error {
	cmd := &cobra.Command{
		Use:   "npm",
		Short: "Run npm commands",
		// 	Long: ``,
		SilenceUsage:  true,
		SilenceErrors: true,
		// Args:               cobra.An,
		Hidden:             false,
		DisableFlagParsing: true,
		TraverseChildren:   true,
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := initContext()

			if err := settings.InstallVoltaIfNeeded(ctx); err != nil {
				return errors.Wrap(err, "check node")
			}

			return experiment.RunCmd(ctx, "", "npm", args...)
		},
	}

	parent.AddCommand(cmd)

	return nil
}
