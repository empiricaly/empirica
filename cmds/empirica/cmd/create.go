package cmd

import (
	"fmt"
	"os/exec"
	"strings"

	"github.com/empiricaly/empirica/internal/experiment"
	"github.com/empiricaly/empirica/internal/settings"
	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
	"github.com/spf13/cobra"
)

func addCreateCommand(parent *cobra.Command) error {
	parent.AddCommand(&cobra.Command{
		Use:   "create",
		Short: "Create a new Empirica project",
		// 	Long: ``,
		SilenceUsage:  true,
		SilenceErrors: true,
		Args:          cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			if len(args) != 1 {
				return errors.New("missing project name")
			}

			ctx := initContext()

			if err := settings.InstallVoltaIfNeeded(ctx); err != nil {
				return errors.Wrap(err, "check node")
			}

			// current, err := os.Getwd()
			// if

			if err := experiment.Create(ctx, args[0]); err != nil {
				return errors.Wrap(err, "get current directory")
			}

			return nil
		},
	})

	return nil
}

func commandExists(cmd string) bool {
	_, err := exec.LookPath(cmd)
	return err == nil
}

func askForConfirmation() bool {
	var response string

	_, err := fmt.Scanln(&response)
	if err != nil {
		log.Error().Err(err).Msg("Failed to read input")

		return false
	}

	switch strings.ToLower(response) {
	case "y", "yes":
		return true
	case "n", "no":
		return false
	default:
		fmt.Println("I'm sorry but I didn't get what you meant, please type (y)es or (n)o and then press enter:")
		return askForConfirmation()
	}
}
