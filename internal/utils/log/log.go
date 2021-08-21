// Package log configures the logging system.
package log

import (
	"os"
	"time"

	"github.com/mattn/go-isatty"
	"github.com/pkg/errors"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

const consoleTimeFormat = "15:04:05.000"

// Init configures the global logger.
func Init(config *Config) error {
	level, err := zerolog.ParseLevel(config.Level)
	if err != nil {
		return errors.Wrap(err, "parse log level")
	}

	zerolog.SetGlobalLevel(level)

	if !config.JSON && (config.ForceTTY || isatty.IsTerminal(os.Stderr.Fd())) {
		log.Logger = log.Output(zerolog.ConsoleWriter{
			Out:        os.Stderr,
			TimeFormat: consoleTimeFormat,
		})
		zerolog.TimeFieldFormat = zerolog.TimeFormatUnixMs
	} else {
		zerolog.TimestampFunc = func() time.Time {
			return time.Now().UTC()
		}

		zerolog.TimeFieldFormat = "2006-01-02T15:04:05.999999999Z"
	}

	if config.ShowLine {
		log.Logger = log.With().Caller().Logger()
	}

	return nil
}
