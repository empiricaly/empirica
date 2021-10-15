// Package log configures the logging system.
package log

import (
	"encoding/json"
	"fmt"
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
			Out:             os.Stderr,
			TimeFormat:      consoleTimeFormat,
			FormatTimestamp: consoleDefaultFormatTimestamp(consoleTimeFormat, false),
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

func consoleDefaultFormatTimestamp(timeFormat string, noColor bool) zerolog.Formatter {
	return func(i interface{}) string {
		t := "<nil>"
		switch tt := i.(type) {
		case string:
			ts, err := time.Parse(zerolog.TimeFieldFormat, tt)
			if err != nil {
				t = tt
			} else {
				t = ts.Format(timeFormat)
			}
		case json.Number:
			i, err := tt.Int64()
			if err != nil {
				t = tt.String()
			} else {
				var sec, nsec int64 = i, 0
				switch zerolog.TimeFieldFormat {
				case zerolog.TimeFormatUnixMs:
					nsec = int64(time.Duration(i) * time.Millisecond)
					sec = 0
				case zerolog.TimeFormatUnixMicro:
					nsec = int64(time.Duration(i) * time.Microsecond)
					sec = 0
				}
				ts := time.Unix(sec, nsec)
				t = ts.Format(timeFormat)
			}
		}
		return colorize(t, 90, noColor)
	}
}

// colorize returns the string s wrapped in ANSI code c, unless disabled is true.
func colorize(s interface{}, c int, disabled bool) string {
	if disabled {
		return fmt.Sprintf("%s", s)
	}
	return fmt.Sprintf("\x1b[%dm%v\x1b[0m", c, s)
}
