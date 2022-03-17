package experiment

import (
	"context"
	"fmt"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/charmbracelet/lipgloss"
	"github.com/empiricaly/empirica/internal/build"
	"github.com/empiricaly/empirica/internal/settings"
	"github.com/empiricaly/empirica/internal/templates"
	"github.com/pkg/errors"
	"golang.org/x/term"
)

func Create(ctx context.Context, name string) error {
	dir := filepath.Clean(name)

	stop := ShowSpinner("Setup directory")

	if err := CreateDir(dir); err != nil {
		return errors.Wrap(err, "name")
	}

	serverDir := path.Join(dir, "server")
	clientDir := path.Join(dir, "client")

	stop()

	stop = ShowSpinner("Copy project files")

	if err := templates.CopyDir(name, serverDir, "callbacks"); err != nil {
		return errors.Wrap(err, "server: copy directory")
	}

	if err := templates.CopyDir(name, clientDir, "react"); err != nil {
		return errors.Wrap(err, "client: copy directory")
	}

	stop()

	stop = ShowSpinner("Install client packages")

	if err := RunCmdSilent(ctx, clientDir, "yarn", "install", "--silent"); err != nil {
		return errors.Wrap(err, "client")
	}

	stop()

	stop = ShowSpinner("Install server packages")

	if err := RunCmdSilent(ctx, serverDir, "yarn", "install", "--silent"); err != nil {
		return errors.Wrap(err, "server")
	}

	stop()

	if err := Upgrade(ctx, clientDir, serverDir); err != nil {
		return errors.Wrap(err, "upgrade empirica")
	}

	stop = ShowSpinner("Generate default settings")

	if err := settings.Init(name, dir); err != nil {
		return errors.Wrap(err, "empirica")
	}

	stop()

	printCreateDone(name)

	return nil
}

func printCreateDone(name string) {
	doc := strings.Builder{}

	columnWidth, _, _ := term.GetSize(int(os.Stdout.Fd()))

	// fmt.Println(columnWidth)
	// termenv.ClearScreen()
	// termenv.MoveCursor(1, 1)
	// fmt.Print("\n")
	// lipgloss.SetColorProfile(termenv.TrueColor)
	// lipgloss.SetHasDarkBackground(false)

	columnWidth -= 20

	subtle := lipgloss.AdaptiveColor{Light: "#555", Dark: "#aaaaaa"}
	highConstrast := lipgloss.AdaptiveColor{Light: "#222222", Dark: "#ccc"}
	highlight := lipgloss.AdaptiveColor{Light: "#227DE1", Dark: "#227DE1"}
	// special := lipgloss.AdaptiveColor{Light: "#43BF6D", Dark: "#73F59F"}

	list := lipgloss.NewStyle().
		MarginRight(2).
		Width(columnWidth)

	lineHeader := lipgloss.NewStyle().
		PaddingLeft(1).
		PaddingBottom(1).
		Foreground(subtle).
		Render

	command := lipgloss.NewStyle().
		PaddingLeft(2).
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
		lineHeader(highlightStr("Empirica")+subtleStr(" ("+buildStr+") experiment created.")),
		lineHeader(subtleStr("Get started:")),
		command(subtleStr("> ")+urlHeader("cd "+name)),
		command(subtleStr("> ")+urlHeader("empirica")),
	)

	lists := list.Render(
		lipgloss.JoinVertical(lipgloss.Left,
			strs...,
		),
	)

	doc.WriteString(lists)

	docStyle := lipgloss.NewStyle().Padding(2, 2, 2, 2)
	fmt.Fprintln(os.Stderr, docStyle.Render(doc.String()))
}
