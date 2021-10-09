package cmd

import (
	"context"
	"math/rand"
	"os"
	"os/exec"
	"os/signal"
	"path"
	"path/filepath"
	"strings"
	"syscall"
	"time"

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

			if err := runCmd(ctx, clientDir, "yarn", "install"); err != nil {
				return errors.Wrap(err, "client")
			}

			if err := runCmd(ctx, serverDir, "yarn", "install"); err != nil {
				return errors.Wrap(err, "server")
			}

			if err := settings.Init(dir); err != nil {
				return errors.Wrap(err, "empirica")
			}

			// empDir := path.Join(dir, ".empirica")
			// tomlFile := path.Join(empDir, "empirica.toml")

			// if err := createDir(empDir); err != nil {
			// 	return errors.Wrap(err, "empirica dir")
			// }

			// content := []byte(fmt.Sprintf(empiricatoml, randSeq(16), randSeq(6)))
			// if err := ioutil.WriteFile(tomlFile, content, filePerm); err != nil {
			// 	return errors.Wrap(err, "write configuration file")
			// }

			return nil
		},
	})
}

const letterBytes = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
const (
	letterIdxBits = 6                    // 6 bits to represent a letter index
	letterIdxMask = 1<<letterIdxBits - 1 // All 1-bits, as many as letterIdxBits
	letterIdxMax  = 63 / letterIdxBits   // # of letter indices fitting in 63 bits
)

func randSeq(n int) string {
	src := rand.NewSource(time.Now().UnixNano())
	sb := strings.Builder{}
	sb.Grow(n)
	// A src.Int63() generates 63 random bits, enough for letterIdxMax characters!
	for i, cache, remain := n-1, src.Int63(), letterIdxMax; i >= 0; {
		if remain == 0 {
			cache, remain = src.Int63(), letterIdxMax
		}

		if idx := int(cache & letterIdxMask); idx < len(letterBytes) {
			sb.WriteByte(letterBytes[idx])
			i--
		}

		cache >>= letterIdxBits

		remain--
	}

	return sb.String()
}

const (
	dirPerm  = 0777
	filePerm = 0600
)

func createDir(dir string) error {
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		if err := os.MkdirAll(dir, dirPerm); err != nil {
			return errors.Wrap(err, "create directory")
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
