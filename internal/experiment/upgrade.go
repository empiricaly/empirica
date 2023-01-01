package experiment

import (
	"context"

	"github.com/empiricaly/empirica/internal/build"
	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
	"gopkg.in/yaml.v3"
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

func UpgradeCommand(ctx context.Context, version, clientDir string) error {
	if version == "latest" {
		v := GetVersion(clientDir, EmpiricaPackageName)
		if v == nil {
			return errors.New("could not find @empirica/core package in package.json")
		}

		version = "v" + v.Resolved
	}

	binPath, err := build.DownloadBinary(&build.Build{Version: version}, false)
	if err != nil {
		return errors.Wrap(err, "download binary")
	}

	vers, err := build.GetBinaryBuild(binPath)
	if err != nil {
		return errors.Wrap(err, "get bin build")
	}

	if err := build.SaveReleaseFileVersion(clientDir+"/..", vers); err != nil {
		return errors.Wrap(err, "save release version")
	}

	return nil
}

func UpgradeCommandGlobal(ctx context.Context, version string) error {
	bd := build.NewProdBuild()
	if version != "" && version != "latest" {
		bd = new(build.Build)
		if err := yaml.Unmarshal([]byte(version), bd); err != nil {
			return errors.Wrap(err, "read version arg")
		}

		if bd.Empty() {
			return errors.New("version is empty")
		}

		log.Debug().
			Interface("build", bd).
			Msg("proxy: using build from env var")
	}

	binPath, err := build.DownloadBinary(bd, true)
	if err != nil {
		return errors.Wrap(err, "download binary")
	}

	_, err = build.GetBinaryBuild(binPath)
	if err != nil {
		return errors.Wrap(err, "get bin build")
	}

	return nil
}
