package cmd

import (
	"fmt"

	"github.com/empiricaly/empirica/internal/settings"
	"github.com/pkg/errors"
	"github.com/spf13/cobra"
)

const postInstallMsg = `
To get started fast:

  empirica create my-experiment
  cd my-experiment
  empirica

Otherwise head over to https://docs.empirica.ly.
`

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
			if err := settings.InstallVoltaIfNeeded(initContext()); err != nil {
				return errors.Wrap(err, "install volta")
			}

			fmt.Println(postInstallMsg)

			return nil
		},
	}

	parent.AddCommand(cmd)

	return nil
}
