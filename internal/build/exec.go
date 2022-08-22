package build

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/url"
	"os"
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
	"gopkg.in/yaml.v3"
)

const (
	BuildSelectionEnvVar = "EMPIRICA_BUILD"
	DebugBuildEnvVar     = "EMPIRICA_DEBUG_BUILD"
	DownloadRootEnvVar   = "EMPIRICA_DOWNLOAD_ROOT"
	BuildSelectionFile   = "release"
)

func BinarySelectionPath() string {
	return settings.EmpiricaDir + "/" + BuildSelectionFile
}

var (
	ErrBuildMissing = errors.New("build info missing")
	ErrBuildEmpty   = errors.New("build info empty")
)

// BinaryVersion returns which binary version should be used. It will first
// use the environement variable override, then try to look for the version lock
// file inside a project.
func BinaryVersion() (*Build, error) {
	build := &Build{}

	env := os.Getenv(BuildSelectionEnvVar)

	if env != "" {
		if err := json.Unmarshal([]byte(env), build); err != nil {
			return nil, errors.Wrap(err, "read "+BuildSelectionEnvVar)
		}

		if build.Empty() {
			return nil, errors.New(BuildSelectionEnvVar + " is empty")
		}
	} else {
		content, err := ioutil.ReadFile(BinarySelectionPath())
		if err != nil {
			return nil, ErrBuildMissing
		}

		err = yaml.Unmarshal(content, build)
		if err != nil {
			return nil, errors.Wrap(err, "read yaml release file")
		}

		if build.Empty() {
			return nil, ErrBuildEmpty
		}
	}

	return build, nil
}

func binaryPath(build *Build) (string, error) {
	components, err := build.VersionComponents()
	if err != nil {
		return "", errors.Wrap(err, "find binary path")
	}

	p := path.Join(settings.SharedDataDir(), "binaries", path.Join(components...))

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

	components, err := build.VersionComponents()
	if err != nil {
		return nil, errors.Wrap(err, "version components")
	}

	comps := strings.Join(components, "/")
	addr := fmt.Sprintf("%s/%s/%s/%s/empirica", root, runtime.GOOS, runtime.GOARCH, comps)

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

func DownloadBinary(build *Build, fileName string) error {
	u, err := BinaryURL(build)
	if err != nil {
		return errors.Wrap(err, "get binary url")
	}

	err = os.MkdirAll(path.Dir(fileName), os.ModePerm)
	if err != nil {
		return errors.Wrap(err, "create binary dir")
	}

	client := grab.NewClient()

	req, err := grab.NewRequest(os.TempDir(), u.String())
	if err != nil {
		return errors.Wrap(err, "create request")
	}

	ctx, cancel := context.WithTimeout(context.Background(), maxDownloadDuration)
	defer cancel()

	req = req.WithContext(ctx)

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

	resp := client.Do(req)

	t := time.NewTicker(dowloadUIRefreshRate)
	defer t.Stop()

Loop:
	for {
		select {
		case <-t.C:
			p.Send(progressMsg(resp.Progress()))

		case <-resp.Done:
			p.Send(progressMsg(1))

			// download is complete
			break Loop
		}
	}

	time.Sleep(dowloadDoneWait)
	p.ReleaseTerminal()

	// check for errors
	if err := resp.Err(); err != nil {
		fmt.Fprintf(os.Stderr, "Download failed: %v\n", err)

		os.Exit(1)
	}

	if err := os.Chmod(resp.Filename, executableMode); err != nil {
		return errors.Wrap(err, "make binary executable")
	}

	dst, err := filepath.Abs(fileName)
	if err != nil {
		return errors.Wrap(err, "get destination path")
	}

	if err := os.Rename(resp.Filename, dst); err != nil {
		return errors.Wrap(err, "copy binary file")
	}

	return nil
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
		} else {
			return "", errors.Wrap(err, "find binary version")
		}
	}

	binpath, err := binaryPath(build)
	if err != nil {
		return "", errors.Wrap(err, "get binary path")
	}

	if _, err := os.Stat(binpath); errors.Is(err, os.ErrNotExist) {
		if err := DownloadBinary(build, binpath); err != nil {
			return "", errors.Wrap(err, "download binary")
		}
	}

	return binpath, nil
}
