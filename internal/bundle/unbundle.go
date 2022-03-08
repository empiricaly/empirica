package bundle

import (
	"archive/tar"
	"context"
	"fmt"
	"io"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/empiricaly/empirica"
	"github.com/klauspost/compress/gzip"
	"github.com/klauspost/compress/zstd"
	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
	"github.com/twmb/murmur3"
)

func Unbundle(ctx context.Context, conf *empirica.Config, in string, clean bool) (string, error) {
	ext := path.Ext(in)
	useGzip := ext == ".tgz"

	f, err := os.Open(in)
	if err != nil {
		return "", errors.Wrap(err, "open bundle")
	}
	defer f.Close()

	hasher := murmur3.New64()
	io.Copy(hasher, f)
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
				return "", errors.Wrap(err, "remove previous installation")
			}
		} else {
			return dir, nil
		}
	}

	log.Info().
		Str("target", dir).
		Msg("unbundle: installing")

	if _, err := f.Seek(0, io.SeekStart); err != nil {
		return "", errors.Wrap(err, "rewind file")
	}

	var decompressor io.Reader
	if useGzip {
		gzipReader, err := gzip.NewReader(f)
		if err != nil {
			return "", errors.Wrap(err, "create zstd reader")
		}
		defer gzipReader.Close()

		decompressor = gzipReader
	} else {
		zstdReader, err := zstd.NewReader(f)
		if err != nil {
			return "", errors.Wrap(err, "create zstd reader")
		}
		defer zstdReader.Close()

		decompressor = zstdReader
	}

	tr := tar.NewReader(decompressor)

	for {
		header, err := tr.Next()

		switch {
		case err == io.EOF:
			return dir, nil
		case err != nil:
			return "", errors.Wrap(err, "read tar")

		// if the header is nil, just skip it (not sure how this happens)
		case header == nil:
			continue
		}

		if err := unbundleFile(tr, header, dir); err != nil {
			return "", errors.Wrap(err, "untar file")
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

		log.Debug().
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
