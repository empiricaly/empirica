package cmd

import (
	"fmt"

	"github.com/spf13/cobra"
)

func addCreateCommand(parent *cobra.Command) {
	parent.AddCommand(&cobra.Command{
		Use:   "create",
		Short: "Create a new Empirica project",
		// 	Long: `A longer description that spans multiple lines and likely contains examples
		// and usage of using your command. For example:

		// Cobra is a CLI library for Go that empowers applications.
		// This application is a tool to generate the needed files
		// to quickly create a Cobra application.`,
		SilenceUsage:  true,
		SilenceErrors: true,
		Args:          cobra.ExactArgs(1),
		Run: func(cmd *cobra.Command, args []string) {
			fmt.Println("create called")
		},
	})
}
