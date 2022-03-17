package cmd

import (
	"github.com/empiricaly/empirica/internal/experiment"
	"github.com/spf13/cobra"
)

func addUpgradeCommand(parent *cobra.Command) error {
	cmd := &cobra.Command{
		Use:   "upgrade",
		Short: "Upgrade empirica packages",
		// 	Long: ``,
		SilenceUsage:  true,
		SilenceErrors: true,
		Args:          cobra.NoArgs,
		Hidden:        false,
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := initContext()
			conf := getConfig()

			return experiment.Upgrade(ctx, conf.Player.Path, conf.Callbacks.Path)
		},
	}

	parent.AddCommand(cmd)

	return nil
}
