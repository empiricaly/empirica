package build

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"time"

	"github.com/cavaliergopher/grab/v3"
	"github.com/charmbracelet/bubbles/progress"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/muesli/termenv"
	"github.com/pkg/errors"
)

const (
	maxDownloadDuration  = 150 * time.Second
	dowloadUIRefreshRate = 350 * time.Millisecond
	dowloadDoneWait      = 775 * time.Millisecond
)

func downloadFile(u *url.URL) (string, error) {
	client := grab.NewClient()

	req, err := grab.NewRequest(os.TempDir(), u.String())
	if err != nil {
		return "", errors.Wrap(err, "create request")
	}

	ctx, cancel := context.WithTimeout(context.Background(), maxDownloadDuration)
	defer cancel()

	req = req.WithContext(ctx)
	resp := client.Do(req)

	fileInfo, _ := os.Stdout.Stat()
	hasTTY := (fileInfo.Mode() & os.ModeCharDevice) != 0

	if hasTTY {
		m := model{
			url:      u.String(),
			progress: progress.New(progress.WithGradient("#5098E7", "#1965B8")),
		}

		lipgloss.SetColorProfile(termenv.TrueColor)
		lipgloss.SetHasDarkBackground(termenv.HasDarkBackground())

		p := tea.NewProgram(m)

		go func() {
			if err := p.Start(); err != nil {
				fmt.Fprintf(os.Stderr, "Error running program: %v\n", err)

				os.Exit(1)
			}
		}()

		t := time.NewTicker(dowloadUIRefreshRate)
		defer t.Stop()

	Loop:
		for {
			select {
			case <-t.C:
				p.Send(progressMsg(resp.Progress()))

			case <-resp.Done:
				if resp.Err() != nil {
					p.Send(progressErrMsg{err: resp.Err()})
				} else {
					p.Send(progressMsg(1))
				}

				// download is complete
				break Loop
			}
		}

		time.Sleep(dowloadDoneWait)
		p.ReleaseTerminal()
	}

	return resp.Filename, resp.Err()
}
