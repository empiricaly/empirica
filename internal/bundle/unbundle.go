package bundle

import (
	"archive/tar"
	"context"
	"fmt"
	"io"
	"io/ioutil"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/empiricaly/empirica"
	"github.com/empiricaly/empirica/internal/settings"
	"github.com/klauspost/compress/gzip"
	"github.com/klauspost/compress/zstd"
	cp "github.com/otiai10/copy"
	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
	"github.com/twmb/murmur3"
)

func prepDotEmpirica(inConf *empirica.Config, dir string, devMode bool) (*empirica.Config, error) {
	wd, err := os.Getwd()
	if err != nil {
		return nil, errors.Wrap(err, "get working dir")
	}

	dst := path.Join(wd, settings.EmpiricaDir)
	src := path.Join(dir, settings.EmpiricaDir)

	_, err = os.Stat(dst)

	if err != nil && !os.IsNotExist(err) {
		return nil, errors.Wrapf(err, "check %s already exists", settings.EmpiricaDir)
	}

	if !os.IsNotExist(err) {
		for _, fileName := range []string{"empirica.toml", "treatments.yaml", "lobbies.yaml"} {
			bytesRead, err := ioutil.ReadFile(path.Join(src, fileName))
			if err != nil {
				return nil, errors.Wrapf(err, "read %s", fileName)
			}

			err = ioutil.WriteFile(path.Join(dst, fileName), bytesRead, 0o600)
			if err != nil {
				return nil, errors.Wrapf(err, "write %s", fileName)
			}
		}
	} else {
		if err := cp.Copy(src, dst, cp.Options{Sync: true}); err != nil {
			return nil, errors.Wrapf(err, "copy %s", settings.EmpiricaDir)
		}
	}

	confFile := path.Join(dst, "empirica.toml")

	if _, err = os.Stat(confFile); err != nil && !os.IsNotExist(err) {
		log.Error().Err(err).Msgf("check %s already exists", settings.EmpiricaDir)
	}

	conf := new(empirica.Config)

	viper.SetConfigFile(confFile)
	viper.ReadInConfig()

	if err := viper.Unmarshal(conf); err != nil {
		log.Fatal().Err(err).Msg("could not parse configuration")
	}

	log.Trace().
		Interface("config", conf).
		Str("file", confFile).
		Msg("config: load new config file")

	// FIXME configuration manual tweaking is not ideal

	conf.Callbacks.Token = conf.Tajriba.Auth.ServiceRegistrationToken
	conf.Production = !devMode
	conf.Server.Production = !devMode
	conf.Tajriba.Server.Production = !devMode

	if inConf.Tajriba.Store.UseMemory {
		conf.Tajriba.Store.UseMemory = true
	}

	if inConf.Tajriba.Store.File != empirica.DefaultStoreFile {
		conf.Tajriba.Store.File = inConf.Tajriba.Store.File
	}

	if err := os.MkdirAll(path.Dir(conf.Tajriba.Store.File), os.ModePerm); err != nil {
		return nil, errors.Wrap(err, "create storage dir")
	}

	return conf, nil
}

func Unbundle(_ context.Context, config *empirica.Config, in string, clean, devMode bool) (string, *empirica.Config, error) {
	f, err := os.Open(in)
	if err != nil {
		return "", nil, errors.Wrap(err, "open bundle")
	}
	defer f.Close()

	hasher := murmur3.New64()
	if _, err := io.Copy(hasher, f); err != nil {
		return "", nil, errors.Wrap(err, "hash bundle")
	}

	hash := fmt.Sprintf("%x", hasher.Sum64())

	dir := path.Join(os.TempDir(), hash)

	if _, err := os.Stat(dir); err == nil {
		log.Info().
			Str("target", dir).
			Msg("unbundle: already installed")

		if clean {
			log.Info().
				Str("target", dir).
				Msg("unbundle: removing old installation")

			if err := os.RemoveAll(dir); err != nil {
				return "", nil, errors.Wrap(err, "remove previous installation")
			}
		} else {
			conf, err := prepDotEmpirica(config, dir, devMode)
			if err != nil {
				return "", nil, errors.Wrapf(err, "copy %s", settings.EmpiricaDir)
			}

			return dir, conf, nil
		}
	}

	log.Info().
		Str("target", dir).
		Msg("unbundle: installing")

	if _, err := f.Seek(0, io.SeekStart); err != nil {
		return "", nil, errors.Wrap(err, "rewind file")
	}

	var decompressor io.Reader
	if useGzip := path.Ext(in) == ".tgz"; useGzip {
		gzipReader, err := gzip.NewReader(f)
		if err != nil {
			return "", nil, errors.Wrap(err, "create zstd reader")
		}
		defer gzipReader.Close()

		decompressor = gzipReader
	} else {
		zstdReader, err := zstd.NewReader(f)
		if err != nil {
			return "", nil, errors.Wrap(err, "create zstd reader")
		}
		defer zstdReader.Close()

		decompressor = zstdReader
	}

	tr := tar.NewReader(decompressor)

	for {
		header, err := tr.Next()

		switch {
		case errors.Is(err, io.EOF):
			conf, err := prepDotEmpirica(config, dir, devMode)
			if err != nil {
				return "", nil, errors.Wrapf(err, "copy %s", settings.EmpiricaDir)
			}

			return dir, conf, nil
		case err != nil:
			return "", nil, errors.Wrap(err, "read tar")

		// if the header is nil, just skip it (not sure how this happens)
		case header == nil:
			continue
		}

		if err := unbundleFile(tr, header, dir); err != nil {
			return "", nil, errors.Wrap(err, "untar file")
		}
	}
}

func unbundleFile(tr *tar.Reader, header *tar.Header, dir string) error {
	target := filepath.Join(dir, header.Name)

	// Could add more file info (e.g. timestamps). Not sure why would be needed.
	// fi := header.FileInfo()

	switch header.Typeflag {

	// This should generally not happen since we don't add them to the bundle.
	case tar.TypeDir:
		if _, err := os.Stat(target); err != nil {
			if err := os.MkdirAll(target, 0o755); err != nil {
				return errors.Wrap(err, "create dir")
			}
		}

	case tar.TypeReg:

		log.Trace().
			Str("from", header.Name).
			Str("to", target).
			Msg("unbundle: copying file")

		// Sanity check, we're still in our dir.
		targetdir := path.Dir(target)
		if !strings.HasPrefix(targetdir, dir) {
			return errors.New("invalid dir")
		}

		// Create parent dir as needed.
		if _, err := os.Stat(targetdir); err != nil {
			if err := os.MkdirAll(targetdir, 0o755); err != nil {
				return errors.Wrap(err, "create parent dir")
			}
		}

		f, err := os.OpenFile(target, os.O_CREATE|os.O_RDWR, os.FileMode(header.Mode))
		if err != nil {
			return errors.Wrap(err, "open target file")
		}
		defer f.Close()

		if _, err := io.Copy(f, tr); err != nil {
			return errors.Wrap(err, "copy file")
		}

		f.Close()
	}

	return nil
}
