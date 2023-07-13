package experiment

import (
	"context"

	"github.com/empiricaly/empirica/internal/build"
	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
)

func UpgradePackages(ctx context.Context, version, playerPath, callbacksPath string) error {
	stop := ShowSpinner("Upgrade empirica packages")

	if err := RunCmdSilent(ctx, playerPath, "npm", "install", "--silent", "-E", "@empirica/core@"+version); err != nil {
		return errors.Wrap(err, "upgrade client")
	}

	if err := RunCmdSilent(ctx, callbacksPath, "npm", "install", "--silent", "-E", "@empirica/core@"+version); err != nil {
		return errors.Wrap(err, "upgrade server")
	}

	stop()

	return nil
}

func UpgradeCommand(ctx context.Context, version, baseDir string) error {
	b, err := UpgradeCommandGlobal(ctx, version)
	if err != nil {
		return errors.Wrap(err, "upgrade globally")
	}

	pb, _, err := build.GetProjectRelease()
	if err != nil {
		return errors.Wrap(err, "get project release")
	}

	if pb.Version != b.Version {
		if err := build.SaveReleaseFileVersion(baseDir, b); err != nil {
			return errors.Wrap(err, "save release version")
		}

		log.Info().Msgf("empirica command upgraded to v%s", version)
	} else {
		log.Info().Msgf("empirica command already using latest version (v%s)", version)
	}

	return nil
}

func UpgradeCommandGlobal(_ context.Context, version string) (*build.Build, error) {
	b, err := build.Parse(version)
	if err != nil {
		return nil, errors.Wrap(err, "parse version")
	}

	_, exists, _ := build.BinaryVersionExists(b)
	if !exists {
		_, err := build.DownloadBinary(b)
		if err != nil {
			return nil, errors.Wrap(err, "download binary")
		}
	} else {
		log.Info().Msgf("empirica command v%s already installed", version)
	}

	return b, nil
}
