package experiment

import (
	"context"

	"github.com/pkg/errors"
)

func Upgrade(ctx context.Context, playerPath, callbacksPath string) error {
	stop := ShowSpinner("Upgrade to latest empirica packages")

	if err := RunCmdSilent(ctx, playerPath, "yarn", "upgrade", "--silent", "@empirica/player@latest"); err != nil {
		return errors.Wrap(err, "upgrade client")
	}

	if err := RunCmdSilent(ctx, callbacksPath, "yarn", "upgrade", "--silent", "@empirica/admin@latest"); err != nil {
		return errors.Wrap(err, "upgrade server")
	}

	stop()

	return nil
}
