package callbacks

import (
	"bytes"
	"context"
	"io"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/cortesi/moddwatch"
	"github.com/empiricaly/empirica/internal/term"
	"github.com/jpillora/backoff"
	"github.com/pkg/errors"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/sasha-s/go-deadlock"
)

type Callbacks struct {
	ctx    context.Context
	config *Config

	c            *exec.Cmd
	stdout       *callbacksWriter
	stderr       *callbacksWriter
	comp         *term.Component
	isDefaultCmd bool

	deadlock.Mutex
}

func Build(ctx context.Context, config *Config) error {
	cmd := config.BuildCmd

	parts := strings.Split(cmd, " ")
	if len(parts) == 0 {
		return errors.New("empty callbacks buildcmd")
	}

	var args []string
	if len(parts) > 1 {
		args = parts[1:]
	}

	c := exec.CommandContext(ctx, parts[0], args...)

	c.Stderr = os.Stderr
	c.Stdout = os.Stdout
	c.Dir = config.Path

	if err := c.Run(); err != nil {
		return errors.Wrap(err, "run callbacks build command")
	}

	return nil
}

// BuildDir returns the build dir.
func BuildDir(config *Config) string {
	return path.Join(config.Path, config.BuildDir)
}

// CleanupBuildDir removes the build dir.
func CleanupBuildDir(config *Config) {
	log.Trace().
		Str("path", BuildDir(config)).
		Msg("callbacks: cleanup build dir")
	os.RemoveAll(BuildDir(config))
}

// Start creates and starts the GraphQL HTTP server.
func Start(
	ctx context.Context,
	config *Config,
) (*Callbacks, error) {
	termui := term.ForContext(ctx)
	comp := termui.Add("server")
	isDefaultCmd := config.DevCmd == defaultDevCommand

	p := &Callbacks{
		config:       config,
		ctx:          ctx,
		comp:         comp,
		isDefaultCmd: isDefaultCmd,
		stdout:       &callbacksWriter{w: os.Stdout, comp: comp, isDefaultCmd: isDefaultCmd},
		stderr:       &callbacksWriter{w: os.Stdout, comp: comp, isDefaultCmd: isDefaultCmd, stderr: true},
	}

	if err := p.start(ctx); err != nil {
		return nil, errors.Wrap(err, "start")
	}

	return p, nil
}

func (cb *Callbacks) start(ctx context.Context) error {
	if err := cb.watch(ctx); err != nil {
		return errors.Wrap(err, "watch callbacks")
	}

	go cb.run(ctx)

	return nil
}

const (
	lullTime   = time.Millisecond * 100
	watchChBuf = 1024
)

func (cb *Callbacks) sigint() {
	pgid, err := syscall.Getpgid(cb.c.Process.Pid)
	if err != nil {
		log.Debug().Err(err).Msg("callback: failed to send signal")

		return
	}

	if err := syscall.Kill(-pgid, syscall.SIGINT); err != nil {
		log.Debug().Err(err).Msg("callback: failed to send signal")
	}

	// if err := cb.c.Process.Signal(os.Interrupt); err != nil {
	// 	log.Debug().Err(err).Msg("callback: failed to send signal")
	// }

	cb.c = nil
}

func (cb *Callbacks) watch(ctx context.Context) error {
	dir, err := os.Getwd()
	if err != nil {
		return errors.Wrap(err, "get current dir")
	}

	p := path.Join(dir, cb.config.Path, "src")

	modchan := make(chan *moddwatch.Mod, watchChBuf)

	var (
		includePaths = []string{"**/*.mjs", "**/*.js"}
		excludePaths = []string{"node_modules"}
	)

	log.Debug().
		Str("path", p).
		Strs("incl", includePaths).
		Strs("excl", excludePaths).
		Msg("callbacks: watchers starting")

	watcher, err := moddwatch.Watch(
		p,
		includePaths,
		excludePaths,
		lullTime,
		modchan,
	)
	if err != nil {
		return errors.Wrap(err, "start watcher")
	}

	go func() {
		for {
			select {
			case mod, ok := <-modchan:
				if mod == nil || !ok {
					log.Trace().Msgf("callbacks: watch ending")

					continue
				}

				log.Trace().Str("mod", mod.String()).Msg("callbacks: mod")

				cb.Lock()

				if cb.c != nil {
					cb.sigint()
				}

				cb.Unlock()
			case <-ctx.Done():
				watcher.Stop()
				log.Debug().Msg("callbacks: watcher done")

				return
			}
		}
	}()

	return nil
}

func (cb *Callbacks) run(ctx context.Context) {
	connRetry := &backoff.Backoff{
		Min:    500 * time.Millisecond,
		Max:    12 * time.Second,
		Factor: 1.5,
		Jitter: true,
	}

	for {
		c, err := cb.runOnce(ctx)
		if err != nil {
			d := connRetry.Duration()

			if !errors.Is(err, context.Canceled) {
				log.Error().
					Err(err).
					Str("waiting", d.String()).
					Msg("callbacks: command failed, restarting")
			}

			select {
			case <-time.After(d):
				continue
			case <-ctx.Done():
				return
			}
		}

		if !cb.isDefaultCmd {
			cb.comp.Ready()
		}

		cb.Lock()
		cb.c = c
		cb.Unlock()

		waiting := make(chan error)
		go func() {
			waiting <- c.Wait()
		}()

		select {
		case <-ctx.Done():
			cb.sigint()
			return
		case err = <-waiting:
		}

		if err != nil {
			errs := err.Error()

			if errors.Is(err, context.Canceled) ||
				strings.Contains(errs, "signal: interrupt") ||
				strings.Contains(errs, "context canceled") ||
				strings.Contains(errs, "signal: killed") ||
				strings.Contains(errs, "signal: hangup") {
				log.Debug().Msg("callback: quit")

				return
			}
		} else {
			select {
			case <-ctx.Done():
				return
			default:
				continue
			}
		}
	}
}

func (cb *Callbacks) runOnce(ctx context.Context) (*exec.Cmd, error) {
	cmd := cb.config.DevCmd

	if cmd == defaultDevCommand {
		lvl := zerolog.GlobalLevel()
		cmd = cmd + " --loglevel " + lvl.String()

		if cb.config.Token != "" {
			cmd = cmd + " --token " + cb.config.Token
		}

		if cb.config.SessionToken != "" {
			p := cb.config.SessionToken
			if !strings.HasPrefix(p, "/") {
				pp, err := filepath.Abs(p)
				if err == nil {
					p = pp
				}
			}
			cmd = cmd + " --sessionTokenPath " + p
		}
	}

	parts := strings.Split(cmd, " ")
	if len(parts) == 0 {
		return nil, errors.New("empty callbacks devcmd")
	}

	var args []string
	if len(parts) > 1 {
		args = parts[1:]
	}

	// parts = append([]string{"-c"}, cmd)
	// spew.Dump(parts)
	// c := exec.CommandContext(ctx, "bash", parts...)

	c := exec.CommandContext(ctx, parts[0], args...)
	c.SysProcAttr = &syscall.SysProcAttr{Setpgid: true, Pgid: 0}

	c.Stderr = cb.stderr
	c.Stdout = cb.stdout
	c.Dir = cb.config.Path

	if err := c.Start(); err != nil {
		return nil, errors.Wrap(err, "run callbacks dev command")
	}

	return c, nil
}

type callbacksWriter struct {
	w            io.Writer
	comp         *term.Component
	isDefaultCmd bool
	startedOnce  bool
	stderr       bool
}

func (c *callbacksWriter) Write(p []byte) (n int, err error) {
	var ready bool
	if c.isDefaultCmd {
		if bytes.Contains(p, []byte("callbacks: started")) {
			ready = true
		}
	}

	if c.stderr {
		c.comp.Logerr(string(p))
	} else {
		c.comp.Log(string(p))
	}

	if ready {
		c.comp.Ready()
		if c.startedOnce {
			go func() {
				time.Sleep(100 * time.Millisecond)
				log.Debug().Msg("callbacks: restarted")
			}()
		}

		c.startedOnce = true
	}

	return len(p), nil
}
