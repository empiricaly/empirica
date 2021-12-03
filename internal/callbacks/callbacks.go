package callbacks

import (
	"context"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"strings"
	"time"

	"github.com/cortesi/moddwatch"
	"github.com/jpillora/backoff"
	"github.com/pkg/errors"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/sasha-s/go-deadlock"
)

type Callbacks struct {
	ctx    context.Context
	config *Config

	c *exec.Cmd

	deadlock.Mutex
}

// Start creates and starts the GraphQL HTTP server.
func Start(
	ctx context.Context,
	config *Config,
) (*Callbacks, error) {
	p := &Callbacks{
		config: config,
		ctx:    ctx,
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

func (cb *Callbacks) watch(ctx context.Context) error {
	dir, err := os.Getwd()
	if err != nil {
		return errors.Wrap(err, "get current dir")
	}

	p := path.Join(dir, cb.config.Path)
	log.Debug().Str("path", p).Msg("callbacks: watchers starting")

	modchan := make(chan *moddwatch.Mod, watchChBuf)

	var (
		includePaths = []string{"**/**.mjs", "**/**.js"}
		excludePaths = []string{"node_modules"}
	)

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
					return
				}

				log.Trace().Str("mod", mod.String()).Msgf("callbacks: mod")

				cb.Lock()
				if cb.c != nil {
					if err := cb.c.Process.Signal(os.Interrupt); err != nil {
						log.Debug().Err(err).Msg("callback: failed to send signal")
					}
					cb.c = nil
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

		if err == nil {
			cb.Lock()
			cb.c = c
			cb.Unlock()

			err = c.Wait()

			if err != nil {
				errs := err.Error()
				if errors.Is(err, context.Canceled) ||
					strings.Contains(errs, "signal: interrupt") ||
					strings.Contains(errs, "signal: killed") ||
					strings.Contains(errs, "signal: hangup") {
					log.Debug().Msg("callback: quit")

					return
				}

				if strings.Contains(errs, "signal: interrupt") {
					log.Debug().Msg("callback: restarting")
					continue
				}
			}

			if err == nil {
				select {
				case <-ctx.Done():
					return
				default:
					continue
				}
			}
		}

		d := connRetry.Duration()

		log.Error().
			Err(err).
			Str("waiting", d.String()).
			Msg("callbacks: command failed, restarting")

		select {
		case <-time.After(d):
			continue
		case <-ctx.Done():
			return
		}
	}
}

func (cb *Callbacks) runOnce(ctx context.Context) (*exec.Cmd, error) {
	cmd := cb.config.DevCmd

	if cmd == defaultCommand {
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

	c := exec.CommandContext(ctx, parts[0], args...)

	c.Stderr = os.Stderr
	c.Stdout = os.Stdout
	c.Dir = cb.config.Path

	if err := c.Start(); err != nil {
		return nil, errors.Wrap(err, "run command")
	}

	return c, nil
}
