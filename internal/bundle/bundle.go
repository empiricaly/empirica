package bundle

import (
	"archive/tar"
	"context"
	"fmt"
	"io"
	"io/fs"
	"os"
	fpath "path"
	"path/filepath"
	"strings"

	"github.com/empiricaly/empirica"
	"github.com/empiricaly/empirica/internal/callbacks"
	"github.com/empiricaly/empirica/internal/player"
	"github.com/empiricaly/empirica/internal/settings"
	"github.com/klauspost/compress/gzip"
	"github.com/klauspost/compress/zstd"
	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
)

func BundleName(conf *empirica.Config, useGzip bool) string {
	name := strings.TrimSpace(conf.Name)
	if name == "" {
		name = "bundle"
	}

	if useGzip {
		name += ".tgz"
	} else {
		name += ".tar.zst"
	}

	return name
}

func Bundle(ctx context.Context, conf *empirica.Config, out string, useGzip bool) error {
	dir, err := os.Getwd()
	if err != nil {
		return errors.Wrap(err, "get current dir")
	}

	if err := player.Build(ctx, conf.Player); err != nil {
		return errors.Wrap(err, "build player")
	}

	if err := callbacks.Build(ctx, conf.Callbacks); err != nil {
		return errors.Wrap(err, "build callbacks")
	}

	name := strings.TrimSpace(out)
	if name == "" {
		name = BundleName(conf, useGzip)
	}

	file, err := os.Create(name)
	if err != nil {
		return errors.Wrapf(err, "create tarball file '%s'", name)
	}
	defer file.Close()

	var compressor io.Writer

	if useGzip {
		gzipWriter, err := gzip.NewWriterLevel(file, gzip.BestSpeed)
		if err != nil {
			return errors.Wrap(err, "create gzip encoder")
		}
		defer gzipWriter.Close()

		compressor = gzipWriter
	} else {
		zstdWriter, err := zstd.NewWriter(file, zstd.WithEncoderLevel(zstd.SpeedDefault), zstd.WithEncoderCRC(true))
		if err != nil {
			return errors.Wrap(err, "create zstd encoder")
		}
		defer zstdWriter.Close()

		compressor = zstdWriter
	}

	tarWriter := tar.NewWriter(compressor)
	defer tarWriter.Close()

	emppath := fpath.Join(dir, settings.EmpiricaDir)
	log.Debug().
		Str("path", emppath).
		Msgf("bundle: bundling %s", settings.EmpiricaDir)
	tarDir(tarWriter, emppath, settings.EmpiricaDir, func(p string) bool {
		return strings.HasPrefix(p, fmt.Sprintf("%s/local/", settings.EmpiricaDir))
	})

	callbackpath := callbacks.BuildDir(conf.Callbacks)
	if !fpath.IsAbs(callbackpath) {
		callbackpath = fpath.Join(dir, callbackpath)
	}

	log.Debug().
		Str("path", callbackpath).
		Msg("bundle: bundling server")

	if err := tarDir(tarWriter, callbackpath, "callbacks", func(p string) bool {
		return strings.Contains(p, "node_modules")
	}); err != nil {
		return errors.Wrap(err, "bundle client")
	}

	if err := bundleFile(tarWriter, fpath.Join(conf.Callbacks.Path, "package.json"), fpath.Join("callbacks", "package.json")); err != nil {
		return errors.Wrap(err, "bundle package.json")
	}

	playerpath := player.BuildDir(conf.Player)
	if !fpath.IsAbs(playerpath) {
		playerpath = fpath.Join(dir, playerpath)
	}

	log.Debug().
		Str("path", playerpath).
		Msg("bundle: bundling client")

	if err := tarDir(tarWriter, playerpath, "player", func(p string) bool {
		return strings.Contains(p, "node_modules") || strings.Contains(p, ".gitkeep")
	}); err != nil {
		return errors.Wrap(err, "bundle client")
	}

	player.CleanupBuildDir(conf.Player)
	callbacks.CleanupBuildDir(conf.Callbacks)

	return nil
}

func tarDir(tw *tar.Writer, src, dest string, skip func(string) bool) error {
	return filepath.WalkDir(src, func(path string, d fs.DirEntry, err error) error {
		topath, err := filepath.Rel(src, path)
		if err != nil {
			return errors.Wrap(err, "get rel path")
		}

		topath = fpath.Join(dest, topath)

		// return on any error
		if err != nil {
			return err
		}

		if d == nil {
			return nil
		}

		// Skip non-files
		if !d.Type().IsRegular() {
			return nil
		}

		if skip(topath) {
			return nil
		}

		if err := bundleFile(tw, path, topath); err != nil {
			return errors.Wrap(err, "bundle file")
		}

		return nil
	})
}

func bundleFile(tw *tar.Writer, path, topath string) error {
	log.Trace().
		Str("from", path).
		Str("to", topath).
		Msg("tar: adding path")

	fi, err := os.Stat(path)
	if err != nil {
		return errors.Wrapf(err, "stat %s", topath)
	}

	header, err := tar.FileInfoHeader(fi, "")
	if err != nil {
		return err
	}

	// update the name to correctly reflect the desired destination when untaring
	header.Name = topath

	// write the header
	if err := tw.WriteHeader(header); err != nil {
		return err
	}

	// open files for taring
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()

	// copy file data into tar writer
	if _, err := io.Copy(tw, f); err != nil {
		return err
	}

	return nil
}
