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

func Init(name, dir string) error {
	return errors.Wrapf(CreateEmpiricaDir(name, dir), "setup %s", EmpiricaDir)
}

var ErrEmpiricaDirMissing = errors.New("empirica directory missing")

func Check(name, dir string) error {
	empDir := path.Join(dir, EmpiricaDir)

	if _, err := os.Stat(empDir); os.IsNotExist(err) {
		return ErrEmpiricaDirMissing
	}

	if err := fillEmpiricaDir(empDir, name); err != nil {
		return errors.Wrap(err, "fill empirica dir")
	}

	localDir := path.Join(empDir, LocalDir)

	if err := createDir(localDir); err != nil {
		return errors.Wrap(err, "create empirica local dir")
	}

	return errors.Wrapf(CreateEmpiricaDir(name, dir), "setup %s", EmpiricaDir)
}

const (
	EmpiricaDir        = ".empirica"
	BuildSelectionFile = "release"
	LocalDir           = "local"
	gitignore          = `local`
	idLen              = 16
	stokenLen          = 16
	passLen            = 8

	TreatmentsYAML = "treatments.yaml"
	treatmentsyaml = `factors:
  - desc: playerCount determines the number of Players are in a Game.
    name: playerCount
    values:
      - value: 1
      - value: 2
      - value: 3
      - value: 5
      - value: 8
      - value: 13
treatments:
  - desc: "Single-player Game"
    factors:
      playerCount: 1
    name: Solo
  - desc: "Two-player Game"
    factors:
      playerCount: 2
    name: Two Players
`

	LobbiesYAML = "lobbies.yaml"
	lobbiesyaml = `lobbies:
- name: Default shared fail
  kind: shared
  duration: 5m
  strategy: fail
- name: Default shared ignore
  kind: shared
  duration: 5m
  strategy: ignore
- name: Default individual
  kind: individual
  duration: 5m
`

	EmpiricaTOML = "empirica.toml"
	empiricatoml = `name = "%s"

[tajriba.auth]
srtoken = "%s"

[[tajriba.auth.users]]
name = "Admin"
username = "admin"
password = "%s"
`
)

func ReadIDFile(dir string) (string, error) {
	empDir := path.Join(dir, EmpiricaDir)
	idfile := path.Join(empDir, "id")

	b, err := ioutil.ReadFile(idfile)

	return string(b), errors.Wrap(err, "read id file")
}

func CreateEmpiricaDir(name, dir string) error {
	empDir := path.Join(dir, EmpiricaDir)

	if err := createDir(empDir); err != nil {
		return errors.Wrapf(err, "create %s dir", EmpiricaDir)
	}

	if err := fillEmpiricaDir(empDir, name); err != nil {
		return errors.Wrap(err, "fill empirica dir")
	}

	localDir := path.Join(empDir, LocalDir)

	if err := createDir(localDir); err != nil {
		return errors.Wrap(err, "create empirica local dir")
	}

	return nil
}

func fillEmpiricaDir(empDir, name string) error {
	giti := path.Join(empDir, ".gitignore")

	if err := writeFile(giti, []byte(gitignore)); err != nil {
		return errors.Wrap(err, "write .gitignore file")
	}

	idfile := path.Join(empDir, "id")

	if err := writeFile(idfile, []byte(randSeq(idLen))); err != nil {
		return errors.Wrap(err, "write id file")
	}

	if name == "" {
		name = "myexperiment"
	}

	tomlFile := path.Join(empDir, EmpiricaTOML)

	content := []byte(fmt.Sprintf(empiricatoml, name, randSeq(stokenLen), randSeq(passLen)))
	if err := writeFile(tomlFile, content); err != nil {
		return errors.Wrap(err, "write configuration file")
	}

	yamlFile := path.Join(empDir, TreatmentsYAML)

	if err := writeFile(yamlFile, []byte(treatmentsyaml)); err != nil {
		return errors.Wrap(err, "write treatments file")
	}

	yamlFile = path.Join(empDir, LobbiesYAML)

	if err := writeFile(yamlFile, []byte(lobbiesyaml)); err != nil {
		return errors.Wrap(err, "write lobbies file")
	}

	return nil
}

const (
	dirPerm  = 0o777
	filePerm = 0o600
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
