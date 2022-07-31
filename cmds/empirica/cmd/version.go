package cmd

import (
	"fmt"

	"github.com/empiricaly/empirica/internal/build"
	jsoniter "github.com/json-iterator/go"
	"github.com/pkg/errors"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var json = jsoniter.ConfigCompatibleWithStandardLibrary

func addVersionCommand(parent *cobra.Command) error {
	cmd := &cobra.Command{
		Use:           "version",
		Short:         "Print empirica version",
		SilenceUsage:  true,
		SilenceErrors: true,
		Args:          cobra.NoArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			outputJSON, err := cmd.Flags().GetBool("json")
			if err != nil {
				return errors.Wrap(err, "parse json flag")
			}

			current := build.Current()
			if outputJSON {
				b, err := json.Marshal(current)
				if err != nil {
					return errors.Wrap(err, "serialize version info")
				}

				fmt.Println(string(b))
			} else {
				fmt.Print(current.String())
			}

			return nil
		},
	}

	cmd.Flags().Bool("json", false, "output as json")

	err := viper.BindPFlags(cmd.Flags())
	if err != nil {
		return errors.Wrap(err, "bind version flags")
	}

	parent.AddCommand(cmd)

	return nil
}
