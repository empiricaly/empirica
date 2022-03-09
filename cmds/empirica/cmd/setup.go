package cmd

import (
	"github.com/empiricaly/empirica/internal/settings"
	"github.com/spf13/cobra"
)

func addSetupCommand(parent *cobra.Command) error {
	cmd := &cobra.Command{
		Use:   "setup",
		Short: "Setup empirica",
		// 	Long: ``,
		SilenceUsage:  true,
		SilenceErrors: true,
		Args:          cobra.NoArgs,
		Hidden:        true,
		RunE: func(cmd *cobra.Command, args []string) error {
			return settings.InstallVoltaIfNeeded(initContext())
		},
	}

	parent.AddCommand(cmd)

	return nil
}
