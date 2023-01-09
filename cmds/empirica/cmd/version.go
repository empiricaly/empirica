package cmd

import (
	"fmt"
	"strings"

	"github.com/empiricaly/empirica/internal/build"
	"github.com/empiricaly/empirica/internal/experiment"
	jsoniter "github.com/json-iterator/go"
	"github.com/pkg/errors"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var json = jsoniter.ConfigCompatibleWithStandardLibrary

type simpleVersionOut struct {
	Build      *build.Build                  `json:"build,omitempty" yaml:"build,omitempty"`
	Components []*experiment.SimpleComponent `json:"components,omitempty" yaml:"components,omitempty"`
}

func (s *simpleVersionOut) String() string {
	var b strings.Builder
	if s.Build != nil {
		b.WriteString(s.Build.String())
	}

	if len(s.Components) > 0 {
		if s.Build != nil {
			b.WriteString("\n")
		}

		for _, comp := range s.Components {
			b.WriteString(comp.String())
			b.WriteString("\n")
		}
	}

	return b.String()
}

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

			out := &simpleVersionOut{
				Build:      build.Current(),
				Components: experiment.GetSimpleComponent(false),
			}
			if outputJSON {
				b, err := json.Marshal(out)
				if err != nil {
					return errors.Wrap(err, "serialize version info")
				}

				fmt.Println(string(b))
			} else {
				fmt.Print(out.String())
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
