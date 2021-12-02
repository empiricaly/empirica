package cmd

import (
	"context"
	"os"
	"os/exec"
	"os/signal"
	"path"
	"path/filepath"
	"strings"
	"syscall"

	"github.com/empiricaly/empirica/internal/settings"
	"github.com/empiricaly/empirica/internal/templates"
	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
	"github.com/spf13/cobra"
)

const empiricatoml = `[tajriba.auth]
srtoken = "%s"

[[tajriba.auth.users]]
name = "Admin"
username = "admin"
password = "%s"
`

func addCreateCommand(parent *cobra.Command) {
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

			ctx, cancel := context.WithCancel(context.Background())

			go func() {
				s := make(chan os.Signal, 1)
				signal.Notify(s, syscall.SIGINT, syscall.SIGTERM, syscall.SIGQUIT, syscall.SIGHUP)
				<-s
				cancel()

				s = make(chan os.Signal, 1)
				signal.Notify(s, syscall.SIGINT, syscall.SIGTERM, syscall.SIGQUIT)
				<-s
				log.Fatal().Msg("Force quit")
			}()

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

			if err := runCmd(ctx, clientDir, "npm", "install"); err != nil {
				return errors.Wrap(err, "client")
			}

			if err := runCmd(ctx, serverDir, "npm", "install"); err != nil {
				return errors.Wrap(err, "server")
			}

			if err := settings.Init(dir); err != nil {
				return errors.Wrap(err, "empirica")
			}

			return nil
		},
	})
}

const dirPerm = 0777

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
