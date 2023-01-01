package build

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/url"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/cavaliergopher/grab/v3"
	"github.com/charmbracelet/bubbles/progress"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/empiricaly/empirica/internal/settings"
	"github.com/muesli/termenv"
	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
	"gopkg.in/yaml.v3"
)

const (
	BuildSelectionEnvVar = "EMPIRICA_BUILD"
	DebugBuildEnvVar     = "EMPIRICA_DEBUG_BUILD"
	DownloadRootEnvVar   = "EMPIRICA_DOWNLOAD_ROOT"
	BinaryDirName        = "binaries"
)

var (
	ErrBuildMissing = errors.New("build info missing")
	ErrBuildEmpty   = errors.New("build info empty")
)

func ReleaseFilePath() string {
	return settings.EmpiricaDir + "/" + settings.BuildSelectionFile
}

const filePerm = 0o600 // -rw-------

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
		Msg("proxy: save release file")

	err = os.WriteFile(fpath, b, filePerm)

	return errors.Wrap(err, "save release file")
}

// BinaryVersion returns which binary version should be used. It will first
// use the environement variable override, then try to look for the version lock
// file inside a project.
func BinaryVersion() (*Build, error) {
	build := &Build{}

	env := os.Getenv(BuildSelectionEnvVar)

	if env != "" {
		if err := yaml.Unmarshal([]byte(env), build); err != nil {
			return nil, errors.Wrap(err, "read "+BuildSelectionEnvVar)
		}

		if build.Empty() {
			return nil, errors.New(BuildSelectionEnvVar + " is empty")
		}

		log.Debug().
			Interface("build", build).
			Msg("proxy: using build from env var")
	} else {
		content, err := ioutil.ReadFile(ReleaseFilePath())
		if err != nil {
			if errors.Is(err, os.ErrNotExist) {
				log.Debug().
					Err(err).
					Str("path", ReleaseFilePath()).
					Msg("proxy: no release file")
			} else {
				return nil, errors.Wrap(err, "read release file")
			}

			return nil, ErrBuildMissing
		}

		err = yaml.Unmarshal(content, build)
		if err != nil {
			return nil, errors.Wrap(err, "read yaml release file")
		}

		if build.Empty() {
			return nil, ErrBuildEmpty
		}

		log.Debug().
			Interface("build", build).
			Msg("proxy: using build from release file")
	}

	return build, nil
}

func binaryDir() string {
	return path.Join(settings.SharedDataDir(), BinaryDirName)
}

func binaryPaths(build *Build) ([]string, error) {
	components, err := build.PathComponents(false)
	if err != nil {
		return nil, errors.Wrap(err, "find binary paths")
	}

	comps := make([]string, 0, len(components))

	for _, comp := range components {
		if runtime.GOOS == "windows" {
			comp = strings.Replace(comp, "/", "\\", -1)
		}

		p := path.Join(binaryDir(), comp)

		if runtime.GOOS == "windows" {
			p += ".exe"
		}

		comps = append(comps, p)
	}

	return comps, nil
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

var ErrBuildNotFound = errors.New("build version not found")

const (
	maxDownloadDuration  = 150 * time.Second
	dowloadUIRefreshRate = 350 * time.Millisecond
	dowloadDoneWait      = 775 * time.Millisecond
	executableMode       = 0o711
)

func DownloadBinary(build *Build, asProd bool) (string, error) {
	u, err := BinaryURL(build)
	if err != nil {
		return "", errors.Wrap(err, "get binary url")
	}

	log.Debug().
		Str("url", u.String()).
		Msg("proxy: binary url")

	binpaths, err := binaryPaths(build)
	if err != nil {
		return "", errors.Wrap(err, "get binary path")
	}

	if len(binpaths) == 0 {
		return "", errors.New("no binary paths found")
	}

	client := grab.NewClient()

	req, err := grab.NewRequest(os.TempDir(), u.String())
	if err != nil {
		return "", errors.Wrap(err, "create request")
	}

	ctx, cancel := context.WithTimeout(context.Background(), maxDownloadDuration)
	defer cancel()

	req = req.WithContext(ctx)
	resp := client.Do(req)

	fileInfo, _ := os.Stdout.Stat()
	hasTTY := (fileInfo.Mode() & os.ModeCharDevice) != 0

	if hasTTY {
		m := model{
			url:      u.String(),
			progress: progress.New(progress.WithGradient("#5098E7", "#1965B8")),
		}

		lipgloss.SetColorProfile(termenv.TrueColor)
		lipgloss.SetHasDarkBackground(termenv.HasDarkBackground())

		p := tea.NewProgram(m)

		go func() {
			if err := p.Start(); err != nil {
				fmt.Fprintf(os.Stderr, "Error running program: %v\n", err)

				os.Exit(1)
			}
		}()

		t := time.NewTicker(dowloadUIRefreshRate)
		defer t.Stop()

	Loop:
		for {
			select {
			case <-t.C:
				p.Send(progressMsg(resp.Progress()))

			case <-resp.Done:
				if resp.Err() != nil {
					p.Send(progressErrMsg{err: resp.Err()})
				} else {
					p.Send(progressMsg(1))
				}

				// download is complete
				break Loop
			}
		}

		time.Sleep(dowloadDoneWait)
		p.ReleaseTerminal()
	}

	// check for errors
	if err := resp.Err(); err != nil {
		return "", errors.Wrap(err, "http fetch")
	}

	defer os.Remove(resp.Filename)

	if err := os.Chmod(resp.Filename, executableMode); err != nil {
		return "", errors.Wrap(err, "make binary executable")
	}

	newbuild, err := GetBinaryBuild(resp.Filename)
	if err != nil {
		return "", errors.Wrap(err, "get binary build")
	}

	newbuild.prod = build.prod
	newbuild.dev = build.dev

	if asProd {
		newbuild.prod = true
		newbuild.dev = false
	}

	binpaths, err = binaryPaths(newbuild)
	if err != nil {
		return "", errors.Wrap(err, "get new binary path")
	}

	if len(binpaths) == 0 {
		return "", errors.New("no new binary paths found")
	}

	for _, fileName := range binpaths {
		dst, err := filepath.Abs(fileName)
		if err != nil {
			return "", errors.Wrap(err, "get destination path")
		}

		err = os.MkdirAll(path.Dir(dst), os.ModePerm)
		if err != nil {
			return "", errors.Wrap(err, "create binary dir")
		}

		if err := os.Link(resp.Filename, dst); err != nil {
			if errors.Is(err, os.ErrExist) {
				if err = os.Remove(dst); err != nil {
					return "", errors.Wrap(err, "remove old binary file")
				}

				if err := os.Link(resp.Filename, dst); err != nil {
					return "", errors.Wrap(err, "link new binary file")
				}
			} else {
				return "", errors.Wrap(err, "link binary file")
			}
		}

		log.Debug().
			Str("path", dst).
			Msg("proxy: linked binpath")
	}

	return binpaths[0], nil
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
	build, err := BinaryVersion()
	if err != nil {
		if errors.Is(err, ErrBuildMissing) {
			if os.Getenv(DebugBuildEnvVar) == "1" {
				build = &Build{dev: true}
			} else {
				build = &Build{prod: true}
			}

			log.Debug().
				Interface("build", build).
				Msg("proxy: using generic build version")
		} else {
			return "", errors.Wrap(err, "find binary version")
		}
	}

	binpaths, err := binaryPaths(build)
	if err != nil {
		return "", errors.Wrap(err, "get binary path")
	}

	log.Debug().
		Strs("paths", binpaths).
		Msg("proxy: binary paths")

	var binpath string
	if len(binpaths) > 0 {
		binpath = binpaths[0]
		if _, err := os.Stat(binpath); err != nil {
			if !errors.Is(err, os.ErrNotExist) {
				return "", errors.Wrap(err, "check binary file")
			}

			binpath = ""
		}
	}

	if binpath != "" {
		return binpath, nil
	}

	log.Debug().Msg("proxy: no binary found, downloading")

	if _, err := DownloadBinary(build, false); err != nil {
		return "", errors.Wrap(err, "download binary")
	}

	binpaths, err = binaryPaths(build)
	if err != nil {
		return "", errors.Wrap(err, "get binary path")
	}

	log.Debug().
		Strs("paths", binpaths).
		Msg("proxy: checking downloaded binpaths")

	if len(binpaths) == 0 {
		return "", errors.New("no binary paths found")
	}

	for _, p := range binpaths {
		if _, err := os.Stat(p); err != nil {
			if !errors.Is(err, os.ErrNotExist) {
				return "", errors.Wrap(err, "check binary file")
			}

			continue
		}

		binpath = p
		break
	}

	if binpath == "" {
		return "", errors.New("no binary found")
	}

	log.Debug().
		Str("path", binpath).
		Msg("proxy: binpath chosen")

	return binpath, nil
}
