package experiment

import (
	"context"

	"github.com/pkg/errors"
)

func Upgrade(ctx context.Context, playerPath, callbacksPath string) error {
	stop := ShowSpinner("Upgrade empirica packages")

	if err := RunCmdSilent(ctx, playerPath, "npm", "install", "--silent", "@empirica/player@latest"); err != nil {
		return errors.Wrap(err, "upgrade client")
	}

	if err := RunCmdSilent(ctx, callbacksPath, "npm", "install", "--silent", "@empirica/admin@latest"); err != nil {
		return errors.Wrap(err, "upgrade server")
	}

	stop()

	return nil
}
