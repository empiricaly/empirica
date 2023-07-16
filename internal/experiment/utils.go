package experiment

import (
	"context"
	"fmt"
	"io/ioutil"
	"os"
	"os/exec"
	"strings"
	"syscall"
	"time"

	"github.com/briandowns/spinner"
	"github.com/pkg/errors"
)

const dirPerm = 0o777

func CreateDir(dir string) error {
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		if err := os.MkdirAll(dir, dirPerm); err != nil {
			return errors.Wrapf(err, "create directory '%s'", dir)
		}
	}

	return nil
}

func RunCmd(ctx context.Context, dir, command string, args ...string) error {
	return runCmdSilence(ctx, dir, false, command, args...)
}

func RunCmdSilent(ctx context.Context, dir, command string, args ...string) error {
	return runCmdSilence(ctx, dir, true, command, args...)
}

func runCmdSilence(ctx context.Context, dir string, silent bool, command string, args ...string) error {
	c := exec.CommandContext(ctx, command, args...)
	c.SysProcAttr = &syscall.SysProcAttr{
		Pdeathsig: syscall.SIGKILL,
	}

	if !silent {
		c.Stderr = os.Stderr
		c.Stdout = os.Stdout
	} else {
		c.Stderr = ioutil.Discard
		c.Stdout = ioutil.Discard
	}
	c.Dir = dir

	if err := c.Run(); err != nil {
		return errors.Wrapf(err, "%s %s", command, strings.Join(args, " "))
	}

	return nil
}

func ShowSpinner(text string) func() {
	s := spinner.New(spinner.CharSets[14], 100*time.Millisecond)
	s.Suffix = "  " + text
	s.Start()
	return func() {
		s.Stop()
		fmt.Println("✓  " + text)
	}
}
