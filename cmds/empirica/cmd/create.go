package cmd

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"strings"

	"github.com/empiricaly/empirica/internal/settings"
	"github.com/empiricaly/empirica/internal/templates"
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
			// if err != nil {
			// 	return errors.Wrap(err, "get current directory")
			// }

			project := args[0]

			dir := filepath.Clean(project)

			if err := createDir(dir); err != nil {
				return errors.Wrap(err, "project")
			}

			serverDir := path.Join(dir, "server")
			clientDir := path.Join(dir, "client")

			if err := templates.CopyDir(project, serverDir, "callbacks"); err != nil {
				return errors.Wrap(err, "server: copy directory")
			}

			if err := templates.CopyDir(project, clientDir, "react"); err != nil {
				return errors.Wrap(err, "client: copy directory")
			}

			if err := runCmd(ctx, clientDir, "yarn", "install"); err != nil {
				return errors.Wrap(err, "client")
			}

			if err := runCmd(ctx, serverDir, "yarn", "install"); err != nil {
				return errors.Wrap(err, "server")
			}

			if err := settings.Init(project, dir); err != nil {
				return errors.Wrap(err, "empirica")
			}

			return nil
		},
	})

	return nil
}

const dirPerm = 0o777

func createDir(dir string) error {
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		if err := os.MkdirAll(dir, dirPerm); err != nil {
			return errors.Wrapf(err, "create directory '%s'", dir)
		}
	}

	return nil
}

func runCmd(ctx context.Context, dir, command string, args ...string) error {
	c := exec.CommandContext(ctx, command, args...)

	c.Stderr = os.Stderr
	c.Stdout = os.Stdout
	c.Dir = dir

	if err := c.Run(); err != nil {
		return errors.Wrapf(err, "%s %s", command, strings.Join(args, " "))
	}

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
