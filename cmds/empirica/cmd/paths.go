package cmd

import (
	"fmt"

	"github.com/empiricaly/empirica/internal/build"
	"github.com/spf13/cobra"
)

func addPathsCommand(parent *cobra.Command) error {
	cmd := &cobra.Command{
		Use:           "paths",
		Short:         "Print empirica paths",
		SilenceUsage:  true,
		SilenceErrors: true,
		Hidden:        true,
		Args:          cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			fmt.Println("versions cache dir:", build.VersionsBasePath())

			return nil
		},
	}

	parent.AddCommand(cmd)

	return nil
}
