package build

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/url"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"runtime"
	"sort"

	"github.com/empiricaly/empirica/internal/settings"
	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
	"gopkg.in/yaml.v3"
)

const (
	BuildSelectionEnvVar = "EMPIRICA_BUILD"
	DebugBuildEnvVar     = "EMPIRICA_DEBUG_BUILD"
	DownloadRootEnvVar   = "EMPIRICA_DOWNLOAD_ROOT"
	BinaryDirName        = "bin"
	executableMode       = 0o711 // -rwxr--r--
	filePerm             = 0o600 // -rw-------
)

var (
	ErrBuildMissing        = errors.New("build info missing")
	ErrBuildEmpty          = errors.New("build info empty")
	ErrEmpiricaDirNotFound = errors.New("empirica dir not found")
)

func ReleaseFilePath() string {
	return path.Join(settings.EmpiricaDir, settings.BuildSelectionFile)
}

func FindReleaseFilePath() (releaseFilePath, basePath string, err error) {
	p, base, err := FindEmpiricaDir()
	if err != nil {
		return "", "", err
	}

	return path.Join(p, settings.BuildSelectionFile), base, nil
}

func FindEmpiricaDir() (empiricaPath, basePath string, err error) {
	dir, err := os.Getwd()
	if err != nil || dir == "/" {
		return "", "", ErrEmpiricaDirNotFound
	}

	empDir := path.Join(dir, settings.EmpiricaDir)
	if _, err := os.Stat(empDir); err == nil {
		return empDir, dir, nil
	}

	dir = filepath.Dir(dir)

	for {
		if dir == "/" {
			break
		}

		empDir := path.Join(dir, settings.EmpiricaDir)
		if _, err := os.Stat(empDir); err == nil {
			return empDir, dir, nil
		}

		dir = filepath.Dir(dir)
	}

	return "", "", ErrEmpiricaDirNotFound
}

func SaveReleaseFile(dir string) error {
	build := Current()

	return SaveReleaseFileVersion(dir, build)
}

func SaveReleaseFileVersion(dir string, build *Build) error {
	fpath := ReleaseFilePath()
	if dir != "" {
		fpath = path.Join(dir, fpath)
	}

	b, err := yaml.Marshal(build)
	if err != nil {
		return errors.Wrap(err, "serialize build version")
	}

	log.Debug().
		Str("path", fpath).
		Interface("build", build).
		Str("yaml", string(b)).
		Msg("build: save release file")

	err = os.WriteFile(fpath, b, filePerm)

	return errors.Wrap(err, "save release file")
}

// FindCurrentBinaryVersion returns which binary version should be used.
// It will try to in order to:
// - use environement variable override EMPIRICA_BUILD
// - look for the version lock in the .empirica/release file
// - use the latest installed version.
func FindCurrentBinaryVersion() (*Build, error) {
	if env := os.Getenv(BuildSelectionEnvVar); env != "" {
		build := &Build{}
		if err := yaml.Unmarshal([]byte(env), build); err != nil {
			return nil, errors.Wrap(err, "read "+BuildSelectionEnvVar)
		}

		if build.Empty() {
			return nil, errors.New(BuildSelectionEnvVar + " is empty")
		}

		log.Debug().
			Interface("build", build).
			Msg("build: using build from env var")

		return build, nil
	}

	if build, _, err := GetProjectRelease(); err == nil {
		log.Debug().
			Interface("build", build).
			Msg("build: using build from release file")

		return build, nil
	}

	build, err := GetLatestInstalledVersion()
	if err != nil {
		return nil, errors.Wrap(err, "get latest installed version")
	}

	log.Debug().
		Interface("build", build).
		Msg("build: using latest installed version")

	return build, nil
}

// errNoInstalledVersions is returned when no versions are installed, which
// would imply we are running empirica without the proxy.
var ErrNoInstalledVersions = errors.New("no installed versions")

func GetLatestInstalledVersion() (*Build, error) {
	versions, err := GetInstalledVersions()
	if err != nil {
		return nil, errors.Wrap(err, "get installed versions")
	}

	if len(versions) == 0 {
		return nil, ErrNoInstalledVersions
	}

	return versions[len(versions)-1], nil
}

func GetInstalledVersions() ([]*Build, error) {
	versions := []*Build{}

	binDir := VersionsBasePath()
	if _, err := os.Stat(binDir); os.IsNotExist(err) {
		return versions, nil
	}

	files, err := ioutil.ReadDir(binDir)
	if err != nil {
		return nil, errors.Wrap(err, "read binary dir")
	}

	for _, f := range files {
		if f.IsDir() {
			continue
		}

		versions = append(versions, NewVersionBuild(f.Name()))
	}

	sort.Sort(Builds(versions))

	return versions, nil
}

// Return project build and root path, or and error if we're not in a project or
// we could not parse the release file.
func GetProjectRelease() (*Build, string, error) {
	build := &Build{}

	relPath, base, err := FindReleaseFilePath()
	if err != nil {
		return nil, "", ErrBuildMissing
	}

	content, err := ioutil.ReadFile(relPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			log.Debug().
				Err(err).
				Str("path", ReleaseFilePath()).
				Msg("build: no release file")
		} else {
			return nil, "", errors.Wrap(err, "read release file")
		}

		return nil, "", ErrBuildMissing
	}

	err = yaml.Unmarshal(content, build)
	if err != nil {
		return nil, "", errors.Wrap(err, "read yaml release file")
	}

	if build.Empty() {
		return nil, base, ErrBuildEmpty
	}

	return build, base, nil
}

// The binary directory is where we store the downloaded binaries.
func BinaryCacheDir() string {
	return path.Join(settings.CacheHomeDir(), BinaryDirName)
}

func VersionsBasePath() string {
	return path.Join(BinaryCacheDir(), "version")
}

func VersionPath(version string) string {
	return path.Join(VersionsBasePath(), version)
}

func BinaryPath(build *Build) (string, error) {
	if build == nil {
		return "", errors.New("build is nil")
	}

	if build.Version == "" {
		return "", errors.New("build version is empty")
	}

	p := VersionPath(build.Version)

	if runtime.GOOS == "windows" {
		p += ".exe"
	}

	return p, nil
}

const downloadRoot = "https://install.empirica.dev/empirica"

func DownloadRoot() string {
	env := os.Getenv(DownloadRootEnvVar)

	root := downloadRoot
	if env != "" {
		root = env
	}

	return root
}

func BinaryURL(build *Build) (*url.URL, error) {
	root := DownloadRoot()

	component, err := build.PreferedPathComponent()
	if err != nil {
		return nil, errors.Wrap(err, "version path component")
	}

	addr := fmt.Sprintf("%s/%s/%s/%s/empirica", root, runtime.GOOS, runtime.GOARCH, component)

	if runtime.GOOS == "windows" {
		addr += ".exe"
	}

	u, err := url.Parse(addr)
	if err != nil {
		return nil, errors.Wrap(err, "build binary url")
	}

	return u, nil
}

func DownloadBinary(build *Build) (string, error) {
	u, err := BinaryURL(build)
	if err != nil {
		return "", errors.Wrap(err, "get binary url")
	}

	log.Debug().
		Str("url", u.String()).
		Msg("build: binary url")

	filename, err := downloadFile(u)
	if err != nil {
		return "", errors.Wrap(err, "http fetch")
	}

	defer os.Remove(filename)

	if err := os.Chmod(filename, executableMode); err != nil {
		return "", errors.Wrap(err, "make binary executable")
	}

	binpath, err := BinaryPath(build)
	if err != nil {
		return "", errors.Wrap(err, "get new binary path")
	}

	dst, err := filepath.Abs(binpath)
	if err != nil {
		return "", errors.Wrap(err, "get destination path")
	}

	err = os.MkdirAll(path.Dir(dst), os.ModePerm)
	if err != nil {
		return "", errors.Wrap(err, "create binary dir")
	}

	fileBytes, err := ioutil.ReadFile(filename)
	if err != nil {
		return "", errors.New("failed to read new binary")
	}

	if err = ioutil.WriteFile(dst, fileBytes, executableMode); err != nil {
		if !errors.Is(err, os.ErrExist) {
			return "", errors.Wrap(err, "write binary file")
		}
	}

	log.Debug().
		Str("path", dst).
		Msg("build: finished downloading")

	return binpath, nil
}

type cmdVersion struct {
	Build *Build `json:"build,omitempty" yaml:"build,omitempty"`
}

func GetBinaryBuild(binpath string) (*Build, error) {
	if binpath == "" {
		return nil, errors.New("no path provided")
	}

	out, err := exec.Command(binpath, "version", "--json").Output()
	if err != nil {
		return nil, errors.Wrap(err, "get binary version")
	}

	build := new(cmdVersion)

	err = json.Unmarshal(out, build)
	if err != nil {
		return nil, errors.Wrap(err, "unmarshal build")
	}

	return build.Build, nil
}

func LookupBinary() (string, error) {
	build, err := FindCurrentBinaryVersion()
	if err == nil {
		binpath, exists, _ := BinaryVersionExists(build)
		if exists {
			return binpath, nil
		}
	}

	log.Debug().Msg("build: binary not found, downloading")

	if err != nil {
		rel, err := CurrentLatestRelease()
		if err != nil {
			return "", errors.Wrap(err, "get latest release")
		}

		build, err = Parse(rel)
		if err != nil {
			return "", errors.Wrap(err, "parse version")
		}
	}

	if _, err := DownloadBinary(build); err != nil {
		return "", errors.Wrap(err, "download binary")
	}

	binpath, exists, err := BinaryVersionExists(build)
	if !exists {
		return "", errors.Wrap(err, "check downloaded binary")
	}

	log.Debug().
		Str("path", binpath).
		Msg("build: binpath chosen")

	return binpath, nil
}

func BinaryVersionExists(build *Build) (binpath string, exist bool, err error) {
	binpath, err = BinaryPath(build)
	if err != nil {
		return "", false, errors.Wrap(err, "get binary path")
	}

	log.Debug().
		Str("paths", binpath).
		Msg("build: check binary paths")

	if _, err := os.Stat(binpath); err != nil {
		return "", false, errors.Wrap(err, "check binary file")
	}

	return binpath, true, nil
}
