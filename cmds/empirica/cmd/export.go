package cmd

import (
	"fmt"
	"net/url"
	"os"
	"os/exec"
	"path"
	"strings"
	"time"

	"github.com/empiricaly/empirica/internal/build"
	"github.com/empiricaly/empirica/internal/experiment"
	"github.com/empiricaly/empirica/internal/settings"
	"github.com/empiricaly/empirica/internal/templates"
	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
	"github.com/spf13/cobra"
)

func addExportCommand(parent *cobra.Command) error {
	cmd := &cobra.Command{
		Use:   "export",
		Short: "Export empirica data",
		// 	Long: ``,
		SilenceUsage:  true,
		SilenceErrors: true,
		Args:          cobra.MaximumNArgs(1),
		// Hidden:        true,
		RunE: func(cmd *cobra.Command, args []string) error {
			conf := getConfig(true)
			ctx := cmd.Context()

			fmt.Println("Setting up export environment...")

			wd, err := os.Getwd()
			if err != nil {
				return errors.Wrap(err, "get working directory")
			}

			localDir := path.Join(wd, settings.EmpiricaDir, settings.LocalDir)

			if _, err := os.Stat(localDir); err != nil {
				return errors.New("no .empirica folder found, export must run within a project folder")
			}

			exportScriptDir := path.Join(localDir, "export")

			serverDir := path.Join(wd, "server")
			versServer := experiment.GetVersion(serverDir, build.EmpiricaPackageName)

			// (re-)create export dir. We always reexport for simplicity, so we
			// don't have to manage versions... Should optimize later.
			if _, err := os.Stat(exportScriptDir); err == nil {
				if versServer == nil {
					os.RemoveAll(exportScriptDir)
				} else {
					// Check if version is identical to server/package.json
					versExport := experiment.GetVersion(exportScriptDir, build.EmpiricaPackageName)
					if versExport.Resolved != versServer.Resolved {
						os.RemoveAll(exportScriptDir)
					}
				}
			}

			var version string
			if versServer == nil && os.Getenv("EMPIRICA_DEV") != "" {
				version = "link"

				log.Warn().
					Str("package", build.EmpiricaPackageName).
					Str("EMPIRICA_DEV", "true").
					Msg("export: using locally linked package")
			} else {
				version := versServer.Resolved

				if version == "not found" {
					version = "latest"
				}
			}

			if _, err := os.Stat(exportScriptDir); err != nil {
				if err := templates.CopyDir("", exportScriptDir, "export"); err != nil {
					return errors.Wrap(err, "export: copy export script")
				}

				if version == "link" {
					if err := experiment.RunCmd(ctx, exportScriptDir, "empirica", "npm", "link", "@empirica/core"); err != nil {
						return errors.Wrap(err, "server")
					}
				} else {
					if err := experiment.RunCmdSilent(ctx, exportScriptDir, "empirica", "npm", "install", "--silent"); err != nil {
						return errors.Wrap(err, "server")
					}

					if err := experiment.RunCmdSilent(ctx, exportScriptDir, "empirica", "npm", "install", "--silent", "-E", "@empirica/core@"+version); err != nil {
						return errors.Wrap(err, "upgrade client")
					}
				}
			}

			experimentName := conf.Name
			if experimentName == "" {
				experimentName = "empirica"
			}

			filename := fmt.Sprintf("%s-%s.zip", experimentName, time.Now().Format("2006-01-02-15-04-05"))

			exportArgs := []string{
				"npm",
				"run",
				"export",
				"--",
				"--filename",
				path.Join(wd, filename),
			}

			// tokenFile := conf.Callbacks.SessionToken
			// tokenb, err := os.ReadFile(tokenFile)

			// var token string
			// if err == nil {
			// 	token = string(tokenb)
			// 	token = strings.TrimSpace(token)
			// }

			srtoken := conf.Tajriba.Auth.ServiceRegistrationToken

			if len(args) == 0 {
				tajfile := path.Join(localDir, "tajriba.json")
				exportArgs = append(exportArgs, "--tajfile", tajfile)
			} else {
				if _, err := url.ParseRequestURI(args[0]); err != nil {
					tajfile := path.Join(localDir, args[0])
					exportArgs = append(exportArgs, "--tajfile", tajfile)
				} else {
					exportArgs = append(exportArgs, "--url", args[0])
				}
			}

			exportArgs = append(exportArgs, "--srtoken", srtoken)

			log.Info().
				Str("args", strings.Join(exportArgs, " ")).
				Msg("exporting data")

			c := exec.CommandContext(ctx, "empirica", exportArgs...)

			c.Stderr = os.Stderr
			c.Stdout = os.Stdout
			c.Dir = exportScriptDir

			if err := c.Run(); err != nil {
				return errors.Wrap(err, "run export script")
			}

			return nil
		},
	}

	parent.AddCommand(cmd)

	return nil
}
