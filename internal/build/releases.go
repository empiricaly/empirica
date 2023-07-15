package build

import (
	"encoding/json"
	"net/http"
	"strings"
	"unicode"

	"github.com/pkg/errors"
)

const (
	EmpiricaPackageName       = "@empirica/core"
	EmpiricaLatestReleasePath = "https://api.github.com/repos/empiricaly/empirica/releases/latest"
)

// CurrentLatestRelease returns the latest version of empirica
func CurrentLatestRelease() (string, error) {
	res, err := http.Get(EmpiricaLatestReleasePath)
	if err != nil {
		return "", errors.Wrap(err, "fetch latest release")
	}
	defer res.Body.Close()

	// parse json body
	var release struct {
		TagName string `json:"tag_name"`
	}

	if err := json.NewDecoder(res.Body).Decode(&release); err != nil {
		return "", errors.Wrap(err, "decode json")
	}

	v := strings.TrimPrefix(release.TagName, EmpiricaPackageName)

	// remove anything that's not semver
	v = strings.TrimLeftFunc(v, func(r rune) bool {
		return !unicode.IsDigit(r) && r != '.'
	})

	return v, nil
}
