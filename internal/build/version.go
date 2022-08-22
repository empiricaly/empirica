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

// Commit holds the build Git commit SHA1.
var Commit string

const shaLen = 7

func VersionString() string {
	return Current().String()
}

type Build struct {
	DevBuild string `json:"dev,omitempty" yaml:"dev,omitempty"`
	Version  string `json:"version,omitempty" yaml:"version,omitempty"`
	Tag      string `json:"tag,omitempty" yaml:"tag,omitempty"`
	Commit   string `json:"commit,omitempty" yaml:"commit,omitempty"`
	BuildNum string `json:"build,omitempty" yaml:"build,omitempty"`
	Branch   string `json:"branch,omitempty" yaml:"branch,omitempty"`
	Time     string `json:"time,omitempty" yaml:"time,omitempty"`

	// These are used internally for the build resolver.
	prod bool `json:"-" yaml:"-"`
	dev  bool `json:"-" yaml:"-"`
}

func Current() *Build {
	return &Build{
		Version:  Version(),
		Tag:      Tag,
		Commit:   Commit,
		BuildNum: BuildNum,
		Branch:   Branch,
		Time:     Time,
	}
}

func (b *Build) Empty() bool {
	return b.Version == "" && b.Tag == "" && b.Commit == "" && b.BuildNum == "" && b.Branch == "" && b.DevBuild == ""
}

var ErrEmptyBuild = errors.New("empty build")

// VersionComponents returns the most important key and value of of the build.
// This allows identification of a build by different attributes, with the
// following precedence:
// - version
// - commit
// - build
// - tag
// - branch.
func (b *Build) VersionComponents() (components []string, err error) {
	if b.Empty() {
		if b.prod {
			return []string{"prod"}, nil
		} else if b.dev {
			return []string{"dev"}, nil
		}

		return nil, ErrEmptyBuild
	}

	if b.Version != "" {
		return []string{"tag", b.Version}, nil
	}

	if b.Commit != "" {
		return []string{"commit", b.Commit}, nil
	}

	if b.BuildNum != "" {
		return []string{"build", b.BuildNum}, nil
	}

	if b.Tag != "" {
		return []string{"tag", b.Tag}, nil
	}

	if b.Branch != "" {
		return []string{"branch", b.Branch}, nil
	}

	return nil, ErrEmptyBuild
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

	if b.Commit != "" {
		c := b.Commit
		if len(c) > shaLen {
			c = c[:shaLen]
		}

		fmt.Fprintf(&str, "Commit:  %s\n", c)
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
