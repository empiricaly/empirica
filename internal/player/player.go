package player

import (
	"bytes"
	"context"
	"io"
	"os"
	"os/exec"
	"path"
	"strings"
	"time"

	"github.com/empiricaly/empirica/internal/term"
	"github.com/jpillora/backoff"
	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
)

type Player struct {
	config       *Config
	stdout       io.Writer
	comp         *term.Component
	isDefaultCmd bool
}

func Build(ctx context.Context, config *Config) error {
	cmd := config.BuildCmd

	parts := strings.Split(cmd, " ")
	if len(parts) == 0 {
		return errors.New("empty player buildcmd")
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
		return errors.Wrap(err, "run player build command")
	}

	return nil
}

// BuildDir returns the build dir.
func BuildDir(config *Config) string {
	return path.Join(config.Path, config.BuildDir)
}

// Start creates and starts the GraphQL HTTP server.
func Start(
	ctx context.Context,
	config *Config,
) (*Player, error) {
	os.Setenv("FORCE_COLOR", "3")

	termui := term.ForContext(ctx)
	comp := termui.Add("player")
	isDefaultCmd := config.DevCmd == defaultDevCommand

	p := &Player{
		config:       config,
		comp:         comp,
		stdout:       &playerWriter{w: os.Stdout, comp: comp, isDefaultCmd: isDefaultCmd},
		isDefaultCmd: isDefaultCmd,
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
		c, err := p.runDevCmd(ctx)

		if err == nil {
			// log.Info().Msg("player: started")
			if !p.isDefaultCmd {
				p.comp.Ready()
			}

			err = c.Wait()

			if err != nil {
				errs := err.Error()
				if errors.Is(err, context.Canceled) ||
					strings.Contains(errs, "signal: interrupt") ||
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
			Msg("player: command failed, restarting")

		select {
		case <-time.After(d):
			continue
		case <-ctx.Done():
			return
		}
	}
}

func (p *Player) runDevCmd(ctx context.Context) (*exec.Cmd, error) {
	parts := strings.Split(p.config.DevCmd, " ")
	if len(parts) == 0 {
		return nil, errors.New("empty player devcmd")
	}

	shell := "/bin/sh"
	if sh := os.Getenv("SHELL"); sh != "" {
		shell = sh
	}

	parts = append([]string{shell, "-c"}, strings.Join(parts, " "))

	var args []string
	if len(parts) > 1 {
		args = parts[1:]
	}

	log.Trace().Str("cmd", strings.Join(parts, " ")).Msg("player: run player dev command")

	c := exec.CommandContext(ctx, parts[0], args...)

	c.Stderr = os.Stderr
	c.Stdout = p.stdout
	c.Dir = p.config.Path

	if err := c.Start(); err != nil {
		return nil, errors.Wrap(err, "run player dev command")
	}

	return c, nil
}

// ready in 726ms.

type playerWriter struct {
	w            io.Writer
	comp         *term.Component
	isDefaultCmd bool
}

func (c *playerWriter) Write(p []byte) (n int, err error) {
	var ready bool
	if c.isDefaultCmd {
		// trimmed := bytes.TrimSpace(stripansi.Strip(p))

		// fmt.Println(string(trimmed))

		if bytes.Contains(p, []byte("ready in ")) {
			// if bytes.HasSuffix(trimmed, []byte("ms.")) {
			ready = true
			// }
		}
	}

	c.comp.Log(string(p))

	if ready {
		c.comp.Ready()
	}

	return len(p), nil
	// return c.w.Write(p)
}
