package cmd

import (
	"github.com/empiricaly/empirica/internal/experiment"
	"github.com/pkg/errors"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

func addUpgradeCommand(parent *cobra.Command) error {
	cmd := &cobra.Command{
		Use:   "upgrade",
		Short: "Upgrade empirica packages",
		// 	Long: ``,
		SilenceUsage:  true,
		SilenceErrors: true,
		Args:          cobra.NoArgs,
		Hidden:        false,
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := initContext()
			conf := getConfig()

			version, err := cmd.Flags().GetString("version")
			if err != nil {
				return errors.Wrap(err, "parse version flag")
			}

			commandOnly, err := cmd.Flags().GetBool("commandOnly")
			if err != nil {
				return errors.Wrap(err, "parse commandOnly flag")
			}

			packagesOnly, err := cmd.Flags().GetBool("packagesOnly")
			if err != nil {
				return errors.Wrap(err, "parse packagesOnly flag")
			}

			if commandOnly && packagesOnly {
				return errors.New("cannot use both --commandOnly and --packagesOnly")
			}

			if !commandOnly {
				if err := experiment.UpgradePackages(ctx, version, conf.Player.Path, conf.Callbacks.Path); err != nil {
					return errors.Wrap(err, "upgrade packages")
				}
			}

			if !packagesOnly {
				if err := experiment.UpgradeCommand(ctx, version, conf.Player.Path); err != nil {
					return errors.Wrap(err, "upgrade command")
				}
			}

			return nil
		},
	}

	flag := "version"
	sval := "latest"
	cmd.Flags().String(flag, sval, "Upgrade to version")
	viper.SetDefault(flag, sval)

	flag = "commandOnly"
	bval := false
	cmd.Flags().Bool(flag, bval, "Upgrade only the command line")
	viper.SetDefault(flag, bval)

	flag = "packagesOnly"
	bval = false
	cmd.Flags().Bool(flag, bval, "Upgrade only the packages")
	viper.SetDefault(flag, bval)

	parent.AddCommand(cmd)

	return nil
}
