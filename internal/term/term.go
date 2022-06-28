package term

import (
	"fmt"
	"os"
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/empiricaly/empirica/internal/build"
	"github.com/muesli/termenv"
	"github.com/rs/zerolog/log"
	deadlock "github.com/sasha-s/go-deadlock"
	"golang.org/x/term"
)

type UI struct {
	comps   []*Component
	updates chan update
	close   chan bool

	deadlock.Mutex
}

func New() *UI {
	return &UI{
		updates: make(chan update),
		close:   make(chan bool),
	}
}

func (ui *UI) Start() {
	go ui.run()
}

func (ui *UI) Stop() {
	ui.close <- true
	<-ui.close
	close(ui.updates)
}

func init() {
	lipgloss.SetColorProfile(termenv.TrueColor)
	lipgloss.SetHasDarkBackground(termenv.HasDarkBackground())
}

func (ui *UI) printClean() {
	doc := strings.Builder{}

	columnWidth, _, _ := term.GetSize(int(os.Stdout.Fd()))

	if columnWidth < 0 {
		return
	}

	subtle := lipgloss.AdaptiveColor{Light: "#555", Dark: "#aaaaaa"}
	highConstrast := lipgloss.AdaptiveColor{Light: "#222222", Dark: "#ccc"}
	highlight := lipgloss.AdaptiveColor{Light: "#227DE1", Dark: "#227DE1"}
	// special := lipgloss.AdaptiveColor{Light: "#43BF6D", Dark: "#73F59F"}

	myCuteBorder := lipgloss.Border{
		Top:         "\u2500",
		Bottom:      "",
		Left:        "",
		Right:       "",
		TopLeft:     "",
		TopRight:    "",
		BottomLeft:  "",
		BottomRight: "",
	}

	columnWidth -= 20

	list := lipgloss.NewStyle().
		MarginRight(2).
		Width(columnWidth)

	lineHeader := lipgloss.NewStyle().
		PaddingLeft(1).
		PaddingBottom(1).
		Foreground(subtle).
		Render

	urlLine := lipgloss.NewStyle().
		PaddingLeft(4).
		Render

	subtleStr := lipgloss.NewStyle().
		Foreground(subtle).
		Render

	highlightStr := lipgloss.NewStyle().
		Foreground(highlight).
		Render

	urlHeader := lipgloss.NewStyle().
		Bold(true).
		Foreground(highConstrast).
		Render
	strs := []string{}

	var buildStr string

	// if build.Version == "" {
	if build.BuildNum == "" {
		buildStr = "local build"
	} else {
		buildStr = "build #" + build.BuildNum
	}
	// } else {
	// 	buildStr = build.Version
	// }

	strs = append(strs,
		lineHeader(highlightStr("Empirica")+subtleStr(" ("+buildStr+") server running:")),
		urlLine(urlHeader("Player  ")+subtleStr("http://localhost:3000")),
		urlLine(urlHeader("Admin   ")+subtleStr("http://localhost:3000/admin")),
	)

	lists := list.Render(
		lipgloss.JoinVertical(lipgloss.Left,
			strs...,
		),
	)

	doc.WriteString(lists)

	docStyle := lipgloss.NewStyle().Padding(0, 2, 2, 2)

	border := lipgloss.NewStyle().
		Border(myCuteBorder, true, false, false, false).
		BorderForeground(subtle).
		Render(strings.Repeat(" ", columnWidth))

	fmt.Fprintln(os.Stderr, "")
	fmt.Fprintln(os.Stderr, border)
	fmt.Fprintln(os.Stderr, docStyle.Render(doc.String()))
}

func (ui *UI) run() {
	for {
		select {
		case <-ui.close:
			for _, comp := range ui.comps {
				comp.updates = nil
			}

			close(ui.close)

			return
		case update := <-ui.updates:
			ui.process(update)
		}
	}
}

func (ui *UI) process(update update) {
	switch update.kind {
	case Ready:
		ui.Lock()
		defer ui.Unlock()

		update.component.ready = true

		for _, comp := range ui.comps {
			if !comp.ready {
				return
			}
		}

		ui.printClean()
	case Restarted:
		ui.printClean()
	case Log:
		parts := strings.Split(strings.TrimSuffix(update.text, "\n"), "\n")
		for _, part := range parts {
			os.Stderr.Write([]byte("[" + update.component.Name + "] "))
			os.Stderr.Write([]byte(part))
			os.Stderr.Write([]byte("\n"))
		}
	case Error:
	default:
		log.Warn().Str("kind", update.kind.String()).Msg("term: unknown update")
	}
}

func (ui *UI) Add(name string) *Component {
	comp := &Component{
		Name:    name,
		updates: ui.updates,
	}

	ui.Lock()
	ui.comps = append(ui.comps, comp)
	ui.Unlock()

	return comp
}

type Component struct {
	Name    string
	updates chan<- update
	ready   bool
}

func (c *Component) Ready() {
	if c.updates == nil {
		return
	}

	c.updates <- update{
		kind:      Ready,
		component: c,
	}
}

func (c *Component) Log(text string) {
	if c.updates == nil {
		return
	}

	c.updates <- update{
		kind:      Log,
		text:      text,
		component: c,
	}
}

func (c *Component) Restarted() {
	if c.updates == nil {
		return
	}

	c.updates <- update{
		kind:      Restarted,
		component: c,
	}
}

//go:generate go-enum -f=$GOFILE --marshal --lower --names --noprefix

// updateKind is enumneration of messaging types.
// ENUM(log, error, ready, restarted)
type updateKind uint8

type update struct {
	kind      updateKind
	text      string
	component *Component
}
