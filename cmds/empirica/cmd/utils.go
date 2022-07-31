package cmd

import (
	"io/ioutil"

	"github.com/empiricaly/empirica/internal/treatments"
	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
	"github.com/spf13/cobra"
	"golang.org/x/exp/slices"
	"gopkg.in/yaml.v2"
)

func addUtilsCommands(parent *cobra.Command) error {
	cmd := &cobra.Command{
		Use:   "utils",
		Short: "Utility commands",
		// 	Long: ``,
		SilenceUsage:  true,
		SilenceErrors: true,
		Args:          cobra.NoArgs,
		Hidden:        false,
		// RunE: func(cmd *cobra.Command, args []string) error {
		// 	return nil
		// },
	}

	parent.AddCommand(cmd)

	if err := addUtilsTreatmentsCommands(cmd); err != nil {
		return err
	}

	return nil
}

func addUtilsTreatmentsCommands(parent *cobra.Command) error {
	cmd := &cobra.Command{
		Use:     "treatments",
		Aliases: []string{"treatment"},
		Short:   "Treatments commands",
		// 	Long: ``,
		SilenceUsage:  true,
		SilenceErrors: true,
		Args:          cobra.NoArgs,
		Hidden:        false,
		// RunE: func(cmd *cobra.Command, args []string) error {
		// 	return nil
		// },
	}

	parent.AddCommand(cmd)

	if err := addUtilsTreatmentsConvertCommand(cmd); err != nil {
		return err
	}

	return nil
}

// treatments:
//   - name: default
//     factorIds:
//        - 5fdA6vr33BhsbhABu
//        - 6djXwa8GajhkvFSpF
// factorTypes:
//   - _id: qb2Pte4PBRCwLM9ex
//     name: playerCount
//     description: The Number of players participating in the given game.
//     required: true
//     type: Integer
//     min: 1
// factors:
//   - _id: BY4KoWL8YjLKYTCpa
//     name: "true"
//     value: true
//     factorTypeId: 7YW4tr4XHeYEQ3Szs

type TreatmentsV1 struct {
	Treatments []struct {
		Name        string
		Description string
		FactorIds   []string `yaml:"factorIds"`
	}
	FactorTypes []struct {
		ID          string `yaml:"_id"`
		Name        string
		Description string
		Required    bool
		Type        string
		Min         int
		Max         int
	} `yaml:"factorTypes"`
	Factors []struct {
		ID           string `yaml:"_id"`
		Name         string
		Value        interface{}
		FactorTypeId string `yaml:"factorTypeId"`
	}
}

// factors:
//   - desc: playerCount determines the number of Players are in a Game.
//     name: playerCount
//     values:
//       - value: 1
//       - value: 2
//       - value: 3
//       - value: 5
//       - value: 8
//       - value: 13
// treatments:
//   - desc: "Single-player Game"
//     factors:
//       playerCount: 1
//     name: Solo
//   - desc: "Two-player Game"
//     factors:
//       playerCount: 2
//     name: Two Players

func addUtilsTreatmentsConvertCommand(parent *cobra.Command) error {
	cmd := &cobra.Command{
		Use:           "convert",
		Short:         "Convert Treatments from Empirica v1 to Empirica v2",
		SilenceUsage:  true,
		SilenceErrors: true,
		Args:          cobra.ExactArgs(1),
		Hidden:        false,
		RunE: func(cmd *cobra.Command, args []string) error {
			content, err := ioutil.ReadFile(args[0])
			if err != nil {
				return errors.Wrap(err, "read input file")
			}

			v1 := TreatmentsV1{}

			err = yaml.Unmarshal(content, &v1)
			if err != nil {
				log.Error().Err(err).Msg("Failed read yaml")
			}

			v2 := &treatments.Treatments{}

			for _, t := range v1.FactorTypes {
				fact := &treatments.Factor{
					Name: t.Name,
					Desc: t.Description,
				}
				for _, f := range v1.Factors {
					if f.FactorTypeId == t.ID {
						fact.Values = append(fact.Values, &treatments.FactorValue{
							Name:  t.Name,
							Value: f.Value,
						})
					}
				}

				v2.Factors = append(v2.Factors, fact)
			}

			for _, t := range v1.Treatments {
				treat := &treatments.Treatment{
					Name:    t.Name,
					Desc:    t.Description,
					Factors: make(map[string]interface{}),
				}

				for _, f := range v1.Factors {
					if slices.Contains(t.FactorIds, f.ID) {
						for _, t := range v1.FactorTypes {
							if t.ID == f.FactorTypeId {
								treat.Factors[t.Name] = f.Value
								break
							}
						}
					}
				}

				v2.Treatments = append(v2.Treatments, treat)
			}

			out := "treatments.yaml"
			if args[0] == out {
				out = "treatmentsv2.yaml"
			}

			b, err := yaml.Marshal(v2)
			if err != nil {
				return errors.Wrap(err, "encode treatment v2")
			}

			err = ioutil.WriteFile(out, b, 0o600)
			if err != nil {
				return errors.Wrap(err, "write treatment v2")
			}

			return nil
		},
	}

	parent.AddCommand(cmd)

	return nil
}
