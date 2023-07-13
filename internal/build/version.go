package build

import (
	"fmt"
	"strings"

	"github.com/masterminds/semver"
	"github.com/pkg/errors"
	"gopkg.in/yaml.v3"
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

type Builds []*Build

func (b Builds) Len() int {
	return len(b)
}

func (b Builds) Less(i, j int) bool {
	bi := b[i].Semver()
	bj := b[j].Semver()

	if bi == nil && bj == nil {
		return false
	}

	if bi == nil {
		return true
	}

	if bj == nil {
		return false
	}

	return bi.LessThan(bj)
}

func (b Builds) Swap(i, j int) {
	b[i], b[j] = b[j], b[i]
}

func NewVersionBuild(vers string) *Build {
	if !strings.HasPrefix(vers, "v") {
		vers = "v" + vers
	}

	return &Build{Version: vers}
}

func Parse(vstr string) (*Build, error) {
	version, err := semver.NewVersion(vstr)
	if err == nil {
		return &Build{Version: "v" + version.String()}, nil
	}

	var b Build

	err = yaml.Unmarshal([]byte(vstr), &b)
	if err != nil {
		return nil, errors.Wrap(err, "parse build")
	}

	return &b, nil
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

func (b *Build) Semver() *semver.Version {
	vers, err := semver.NewVersion(b.Version)
	if err != nil {
		return nil
	}

	return vers
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
