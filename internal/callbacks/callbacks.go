package callbacks

import (
	"context"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/jpillora/backoff"
	"github.com/pkg/errors"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

type Callbacks struct {
	config *Config
}

// Start creates and starts the GraphQL HTTP server.
func Start(
	ctx context.Context,
	config *Config,
) (*Callbacks, error) {
	p := &Callbacks{
		config: config,
	}

	go p.run(ctx)

	return p, nil
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
			log.Info().Msg("callbacks: started")

			err = c.Wait()

			if err != nil {
				errs := err.Error()
				if errors.Is(err, context.Canceled) ||
					strings.Contains(errs, "signal: killed") ||
					strings.Contains(errs, "signal: hangup") {
					return
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
		return nil, errors.Wrap(err, "unbuffer run yarn dev")
	}

	return c, nil
}
