package settings

import (
	"context"
	"os"
	"os/exec"
	"path"
	"strings"

	"github.com/adrg/xdg"
	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
)

// InitShared initialize shared environment paths.
func InitShared() {
	os.Setenv("VOLTA_HOME", VoltaDir())
	newPath := strings.Join([]string{VoltaBinDir(), os.Getenv("PATH")}, ":")
	os.Setenv("PATH", newPath)
}

// SharedDataDir returns the path where shared Empirica files should be stored.
// This is generally used as a cache.
func SharedDataDir() string {
	return path.Join(xdg.DataHome, "empirica")
}

// VoltaDir is the directory for the Volta installation.
func VoltaDir() string {
	return path.Join(SharedDataDir(), "volta")
}

// VoltaBinDir is the directory containing the Volta shim executables.
func VoltaBinDir() string {
	return path.Join(VoltaDir(), "bin")
}

func VoltaIsInstalled() bool {
	_, err := os.Stat(VoltaDir())
	return err == nil
}

func InstallVoltaIfNeeded(ctx context.Context) error {
	if VoltaIsInstalled() {
		log.Trace().
			Str("path", VoltaDir()).
			Msg("volta: already installed")

		return nil
	}

	return InstallVolta(ctx)
}

func InstallVolta(ctx context.Context) error {
	log.Trace().
		Str("path", VoltaDir()).
		Msg("volta: installing")

	if err := runCmd(ctx, "", "bash", "-c", "curl https://get.volta.sh | bash -s - --skip-setup"); err != nil {
		return errors.Wrap(err, "install volta")
	}

	if err := runCmd(ctx, "", "volta", "install", "node"); err != nil {
		return errors.Wrap(err, "install node")
	}

	log.Trace().
		Str("path", VoltaDir()).
		Msg("volta: installed")

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
