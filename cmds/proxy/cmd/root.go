package cmd

import (
	"context"
	"os"
	"os/exec"
	"os/signal"
	"strings"
	"syscall"

	"github.com/empiricaly/empirica/internal/build"
	logger "github.com/empiricaly/empirica/internal/utils/log"
	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
)

const (
	UseDebugEnvVar    = "EMPIRICA_PROXY_USE_DEBUG"
	LogsEnabledEnvVar = "EMPIRICA_PROXY_LOGS_ENABLED"
	LogsNoTTYEnvVar   = "EMPIRICA_PROXY_LOGS_NO_TTY"
	LogsJSONEnvVar    = "EMPIRICA_PROXY_LOGS_JSON"
)

func root(args []string) error {
	ctx := initContext()

	logenv := os.Getenv(LogsEnabledEnvVar)
	useDebug := os.Getenv(UseDebugEnvVar)

	logconf := &logger.Config{
		Level:    "fatal",
		ForceTTY: false,
		JSON:     false,
		ShowLine: false,
	}

	if logenv == "1" {
		logconf.Level = "trace"
		logconf.ForceTTY = os.Getenv(LogsNoTTYEnvVar) != "1"
		logconf.JSON = os.Getenv(LogsJSONEnvVar) == "1"
	}

	if err := logger.Init(logconf); err != nil {
		log.Fatal().Err(err).Msg("empirica: failed to init logging")
	}

	var path string
	var err error

	if useDebug == "1" {
		path = "emp"
	} else {
		path, err = build.LookupBinary()
		if err != nil {
			return errors.Wrap(err, "get binary")
		}
	}

	log.Debug().
		Str("path", path).
		Msg("proxy: chosen binary path")

	c := exec.CommandContext(ctx, path, args...)

	c.Stderr = os.Stderr
	c.Stdout = os.Stdout

	if err := c.Start(); err != nil {
		var er *exec.ExitError
		if errors.As(err, &er) {
			os.Exit(er.ExitCode())
		}

		return errors.Wrap(err, "failed to start")
	}

	if err := c.Wait(); err != nil {
		var er *exec.ExitError
		if errors.As(err, &er) {
			os.Exit(er.ExitCode())
		}

		return errors.Wrap(err, "failed to start")
	}

	return nil
}

func failedStart(err error) {
	if err != nil && errors.Is(err, context.Canceled) && strings.Contains(err.Error(), "signal: killed") {
		log.Fatal().Err(err).Msg("empirica: failed to start")
	}
}

func Execute() {
	if err := root(os.Args[1:]); err != nil {
		failedStart(err)
	}
}

func initContext() context.Context {
	ctx, cancel := context.WithCancel(context.Background())

	go func() {
		s := make(chan os.Signal, 1)
		signal.Notify(s, syscall.SIGINT, syscall.SIGTERM, syscall.SIGQUIT, syscall.SIGHUP)
		<-s
		cancel()

		s = make(chan os.Signal, 1)
		signal.Notify(s, syscall.SIGINT, syscall.SIGTERM, syscall.SIGQUIT)
		<-s
		log.Fatal().Msg("empirica: force quit")
	}()

	return ctx
}
