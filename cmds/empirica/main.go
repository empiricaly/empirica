package main

import (
	"github.com/empiricaly/empirica/cmds/empirica/cmd"
)

func main() {
	// defer profile.Start(profile.ClockProfile, profile.NoShutdownHook).Stop()

	cmd.Execute()
}
