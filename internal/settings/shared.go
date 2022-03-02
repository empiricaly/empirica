package settings

import (
	"os"
	"path"
	"strings"

	"github.com/adrg/xdg"
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
