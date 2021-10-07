package player

import (
	"context"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/jpillora/backoff"
	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
)

type Player struct {
	config *Config
}

// Start creates and starts the GraphQL HTTP server.
func Start(
	ctx context.Context,
	config *Config,
) (*Player, error) {
	p := &Player{
		config: config,
	}

	go p.run(ctx)

	return p, nil
}

func (p *Player) run(ctx context.Context) {
	connRetry := &backoff.Backoff{
		Min:    500 * time.Millisecond,
		Max:    12 * time.Second,
		Factor: 1.5,
		Jitter: true,
	}

	for {
		c, err := p.runYarn(ctx)

		if err == nil {
			log.Info().Msg("player: started")

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
			Msg("player: yarn run failed, restarting")

		select {
		case <-time.After(d):
			continue
		case <-ctx.Done():
			return
		}
	}
}

func (p *Player) runYarn(ctx context.Context) (*exec.Cmd, error) {
	parts := strings.Split(p.config.DevCmd, " ")
	if len(parts) == 0 {
		return nil, errors.New("empty player devcmd")
	}

	var args []string
	if len(parts) > 1 {
		args = parts[1:]
	}

	c := exec.CommandContext(ctx, parts[0], args...)

	c.Stderr = os.Stderr
	c.Stdout = os.Stdout
	c.Dir = p.config.Path

	if err := c.Start(); err != nil {
		return nil, errors.Wrap(err, "run command")
	}

	return c, nil
}
