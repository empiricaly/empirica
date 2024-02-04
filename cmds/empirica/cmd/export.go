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

			if err := settings.InstallVoltaIfNeeded(ctx); err != nil {
				return errors.Wrap(err, "check node")
			}

			out, err := cmd.Flags().GetString("out")
			if err != nil {
				return errors.Wrap(err, "parse out flag")
			}

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

			resolvedVersion := "not found"

			vers, _, err := build.GetProjectRelease()
			if err == nil {
				resolvedVersion = vers.Version
			} else {
				serverDir := path.Join(wd, "server")
				versServer := experiment.GetVersion(serverDir, build.EmpiricaPackageName)

				if versServer != nil {
					resolvedVersion = versServer.Resolved
				} else {
					buildVersion := build.Version()
					if buildVersion != "" && strings.HasPrefix(buildVersion, "v") {
						resolvedVersion = strings.TrimPrefix(buildVersion, "v")
					}
				}
			}

			// (re-)create export dir. We always reexport for simplicity, so we
			// don't have to manage versions... Should optimize later.
			if _, err := os.Stat(exportScriptDir); err == nil {
				if resolvedVersion == "" {
					os.RemoveAll(exportScriptDir)
				} else {
					// Check if version is identical to server/package.json
					versExport := experiment.GetVersion(exportScriptDir, build.EmpiricaPackageName)
					if versExport.Resolved != resolvedVersion {
						os.RemoveAll(exportScriptDir)
					}
				}
			}

			empiricaCmd := "empirica"

			if os.Getenv("EMPIRICA_DEV") != "" {
				resolvedVersion = "link"

				empiricaCmd = os.Args[0]

				log.Warn().
					Str("package", build.EmpiricaPackageName).
					Str("EMPIRICA_DEV", "true").
					Msg("export: using locally linked package")
			} else {
				if resolvedVersion == "not found" {
					resolvedVersion = "latest"
				}
			}

			fmt.Println("Exporting data...", empiricaCmd)

			if _, err := os.Stat(exportScriptDir); err != nil {
				if err := templates.CopyDir("", exportScriptDir, "export"); err != nil {
					return errors.Wrap(err, "export: copy export script")
				}

				if resolvedVersion == "link" {
					if err := experiment.RunCmd(ctx, exportScriptDir, empiricaCmd, "npm", "link", "@empirica/core"); err != nil {
						return errors.Wrap(err, "server")
					}
				} else {
					if err := experiment.RunCmdSilent(ctx, exportScriptDir, empiricaCmd, "npm", "install", "--silent"); err != nil {
						return errors.Wrap(err, "server")
					}

					if err := experiment.RunCmdSilent(ctx, exportScriptDir, empiricaCmd, "npm", "install", "--silent", "-E", "@empirica/core@"+resolvedVersion); err != nil {
						return errors.Wrap(err, "upgrade client")
					}
				}
			}

			experimentName := conf.Name
			if experimentName == "" {
				experimentName = "empirica"
			}

			filename := out
			if out == "" {
				filename = path.Join(wd, fmt.Sprintf("%s-%s.zip", experimentName, time.Now().Format("2006-01-02-15-04-05")))
			}

			exportArgs := []string{
				"npm",
				"run",
				"export",
				"--",
				"--filename",
				filename,
			}

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

			c := exec.CommandContext(ctx, empiricaCmd, exportArgs...)

			c.Stderr = os.Stderr
			c.Stdout = os.Stdout
			c.Dir = exportScriptDir

			if err := c.Run(); err != nil {
				return errors.Wrap(err, "run export script")
			}

			return nil
		},
	}

	cmd.Flags().String("out", "", "output zip file name")

	parent.AddCommand(cmd)

	return nil
}
