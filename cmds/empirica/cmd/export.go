package cmd

import (
	"fmt"
	"os"
	"path"
	"time"

	"github.com/empiricaly/empirica/internal/export"
	"github.com/empiricaly/empirica/internal/settings"
	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
	"github.com/spf13/cobra"
)

func addExportCommand(parent *cobra.Command) error {
	cmd := &cobra.Command{
		Use:   "export [tajriba.json file]",
		Short: "Export empirica data",
		Long: `export empirica data to a zip file containing CSV files with the data.

If ran without arguments, at the root of an experiment, it will use the data
file (.empirica/local/tajriba.json) of the current experiment.

You can also specify the path to the tajriba.json file to export as the first
argument. Note: it will use the global version of empirica (not the version
locked in your project). Upgrade to the latest version of empirica with:

	empirica upgrade --global

The output file can be specified with the --out flag. If not specified, it will
be saved in the current working directory with the name:
<experiment-name or empirica>-<timestamp>.zip.
`,
		SilenceUsage:  true,
		SilenceErrors: true,
		Args:          cobra.MaximumNArgs(1),
		// Hidden:        true,
		RunE: func(cmd *cobra.Command, args []string) error {
			conf := getConfig(true)
			ctx := cmd.Context()

			if err := settings.InstallVoltaIfNeeded(ctx); err != nil {
				return errors.Wrap(err, "check node")
			}

			out, err := cmd.Flags().GetString("out")
			if err != nil {
				return errors.Wrap(err, "parse out flag")
			}

			wd, err := os.Getwd()
			if err != nil {
				return errors.Wrap(err, "get working directory")
			}

			var tajfile string
			if len(args) == 1 {
				tajfile = args[0]
			} else {
				localDir := path.Join(wd, settings.EmpiricaDir, settings.LocalDir)

				if _, err := os.Stat(localDir); err != nil {
					return errors.New("no .empirica folder found, export must run within a project folder")
				}

				tajfile = path.Join(localDir, "tajriba.json")
			}

			if _, err := os.Stat(tajfile); err != nil {
				return errors.New("no tajriba.json file found, export must run within a project folder")
			}

			experimentName := conf.Name
			if experimentName == "" {
				experimentName = "empirica"
			}

			filename := out
			if filename == "" {
				filename = path.Join(wd, fmt.Sprintf("%s-%s.zip", experimentName, time.Now().Format("2006-01-02-15-04-05")))
			}

			log.Info().
				Str("output", filename).
				Str("tajriba", tajfile).
				Msg("Starting CSV export...")

			if err := export.ExportCSV(tajfile, filename); err != nil {
				return errors.Wrap(err, "export csv")
			}

			return nil
		},
	}

	cmd.Flags().String("out", "", "output zip file name")

	parent.AddCommand(cmd)

	return nil
}
