package settings

import (
	"fmt"
	"io/ioutil"
	"math/rand"
	"os"
	"path"
	"strings"
	"time"

	"github.com/pkg/errors"
)

func Init(dir string) error {
	return errors.Wrap(CreateEmpiricaDir(dir), "setup .empirica")
}

const (
	EmpiricaDir = ".empirica"
	LocalDir    = "local"
	gitignore   = `local`
	stokenLen   = 16
	passLen     = 6

	TreatmentsYAML = "treatments.yaml"
	treatmentsyaml = `factors:
  - desc: playerCount determines how many players are in a game.
    name: playerCount
    values:
      - value: 1
      - value: 2
      - value: 3
      - value: 5
      - value: 8
      - value: 13
`

	EmpiricaTOML = "empirica.toml"
	empiricatoml = `[tajriba.auth]
srtoken = "%s"

[[tajriba.auth.users]]
name = "Admin"
username = "admin"
password = "%s"
`
)

func CreateEmpiricaDir(dir string) error {
	empDir := path.Join(dir, EmpiricaDir)
	localDir := path.Join(empDir, LocalDir)

	if err := createDir(empDir); err != nil {
		return errors.Wrap(err, ".empirica dir")
	}

	giti := path.Join(empDir, ".gitignore")

	if err := writeFile(giti, []byte(gitignore)); err != nil {
		return errors.Wrap(err, "write .gitignore file")
	}

	tomlFile := path.Join(empDir, EmpiricaTOML)

	content := []byte(fmt.Sprintf(empiricatoml, randSeq(stokenLen), randSeq(passLen)))
	if err := writeFile(tomlFile, content); err != nil {
		return errors.Wrap(err, "write configuration file")
	}

	yamlFile := path.Join(empDir, TreatmentsYAML)

	if err := writeFile(yamlFile, []byte(treatmentsyaml)); err != nil {
		return errors.Wrap(err, "write treatments file")
	}

	if err := createDir(localDir); err != nil {
		return errors.Wrap(err, "empirica dir")
	}

	return nil
}

const (
	dirPerm  = 0777
	filePerm = 0600
)

func createDir(dir string) error {
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		if err := os.MkdirAll(dir, dirPerm); err != nil {
			return errors.Wrap(err, "create directory")
		}
	}

	return nil
}

func writeFile(file string, content []byte) error {
	if _, err := os.Stat(file); os.IsNotExist(err) {
		if err := ioutil.WriteFile(file, content, filePerm); err != nil {
			return errors.Wrapf(err, "write %s", file)
		}
	}

	return nil
}

const letterBytes = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
const (
	letterIdxBits = 6                    // 6 bits to represent a letter index
	letterIdxMask = 1<<letterIdxBits - 1 // All 1-bits, as many as letterIdxBits
	letterIdxMax  = 63 / letterIdxBits   // # of letter indices fitting in 63 bits
)

func randSeq(n int) string {
	src := rand.NewSource(time.Now().UnixNano())
	sb := strings.Builder{}
	sb.Grow(n)
	// A src.Int63() generates 63 random bits, enough for letterIdxMax characters!
	for i, cache, remain := n-1, src.Int63(), letterIdxMax; i >= 0; {
		if remain == 0 {
			cache, remain = src.Int63(), letterIdxMax
		}

		if idx := int(cache & letterIdxMask); idx < len(letterBytes) {
			sb.WriteByte(letterBytes[idx])
			i--
		}

		cache >>= letterIdxBits

		remain--
	}

	return sb.String()
}
