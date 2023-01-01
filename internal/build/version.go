package build

import (
	"fmt"
	"strings"

	"github.com/masterminds/semver"
	"github.com/pkg/errors"
)

// Version return the build version (vX.Y.Z) at build time. Returns "" if this
// build was not a tagged version.
func Version() string {
	if Tag == "" {
		return ""
	}

	if _, err := semver.NewVersion(Tag); err != nil {
		return ""
	}

	return Tag
}

// DevBuild is "true" if this is a development build.
var DevBuild string

// Tag holds the git tag of the build.
var Tag string

// Branch holds the git branch of the build.
var Branch string

// BuildNum holds the build build (123).
var BuildNum string

// Time holds the build time.
var Time string

// SHA holds the build Git commit SHA1.
var SHA string

const shaLen = 7

func VersionString() string {
	return Current().String()
}

type Build struct {
	DevBuild string `json:"dev,omitempty" yaml:"dev,omitempty"`
	Version  string `json:"version,omitempty" yaml:"version,omitempty"`
	SHA      string `json:"sha,omitempty" yaml:"sha,omitempty"`
	BuildNum string `json:"build,omitempty" yaml:"build,omitempty"`
	Tag      string `json:"tag,omitempty" yaml:"tag,omitempty"`
	Branch   string `json:"branch,omitempty" yaml:"branch,omitempty"`
	Time     string `json:"time,omitempty" yaml:"time,omitempty"`

	// These are used internally for the build resolver.
	prod bool `json:"-" yaml:"-"`
	dev  bool `json:"-" yaml:"-"`
}

func NewProdBuild() *Build {
	return &Build{prod: true}
}

func NewDevBuild() *Build {
	return &Build{dev: true}
}

func Current() *Build {
	return &Build{
		Version:  Version(),
		Tag:      Tag,
		SHA:      SHA,
		BuildNum: BuildNum,
		Branch:   Branch,
		Time:     Time,
	}
}

func (b *Build) Empty() bool {
	return b.Version == "" && b.Tag == "" && b.SHA == "" && b.BuildNum == "" && b.Branch == "" && b.DevBuild == ""
}

var ErrEmptyBuild = errors.New("empty build")

type VersionComponent struct {
	Key   string
	Value string
}

// PreferedPathComponent returns the path component (x/y/z) that best identify
// this version, with the following precedence:
// - version
// - sha
// - build
// - tag
// - branch
// E.g. If version == "v1.2.3", then the path components are "version/v1.2.3".
func (b *Build) PreferedPathComponent() (components string, err error) {
	comps, err := b.PathComponents(true)
	if err != nil {
		return "", err
	}

	return comps[0], nil
}

// PathComponents returns all paths components (x/y/z) for this version:
// E.g. "version/v1.2.3", "sha/abcdefg", "build/123", "tag/v1.2.3",
// "branch/master".
func (b *Build) PathComponents(generic bool) (components []string, err error) {
	comps := []string{}

	if generic {
		if b.prod {
			comps = append(comps, "prod")
		}

		if b.dev {
			comps = append(comps, "dev")
		}
	}

	if b.Version != "" {
		comps = append(comps, "version/"+b.Version)
	}

	if b.SHA != "" {
		comps = append(comps, "sha/"+b.SHA)
	}

	if b.BuildNum != "" {
		comps = append(comps, "build/"+b.BuildNum)
	}

	if b.Tag != "" {
		comps = append(comps, "tag/"+b.Tag)
	}

	if b.Branch != "" {
		comps = append(comps, "branch/"+b.Branch)
	}

	if !generic {
		if b.prod {
			comps = append(comps, "prod")
		}

		if b.dev {
			comps = append(comps, "dev")
		}
	}

	if len(comps) == 0 {
		return nil, ErrEmptyBuild
	}

	return comps, nil
}

func (b *Build) String() string {
	if b.Empty() {
		return "No version information found\n"
	}

	if b.DevBuild == " true" {
		return "This is a development build\n"
	}

	var str strings.Builder

	if b.Version != "" {
		fmt.Fprintf(&str, "Version: %s\n", b.Version)
	}

	if b.Tag != "" && b.Version == "" {
		fmt.Fprintf(&str, "Tag:     %s\n", b.Tag)
	}

	if b.SHA != "" {
		c := b.SHA
		if len(c) > shaLen {
			c = c[:shaLen]
		}

		fmt.Fprintf(&str, "SHA:     %s\n", c)
	}

	if b.BuildNum != "" {
		fmt.Fprintf(&str, "Build:   %s\n", b.BuildNum)
	}

	if b.Branch != "" {
		fmt.Fprintf(&str, "Branch:  %s\n", b.Branch)
	}

	if b.Time != "" {
		fmt.Fprintf(&str, "Time:    %s\n", b.Time)
	}

	return str.String()
}
