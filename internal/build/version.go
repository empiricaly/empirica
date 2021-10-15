package build

import "fmt"

// Version holds the build version (vX.Y.Z) at build time.
var Version string

// BuildNum holds the build build (123).
var BuildNum string

// Time holds the build time.
var Time string

// Commit holds the build Git commit SHA1.
var Commit string

func PrintVersion() {
	if Version == "" && Time == "" && Commit == "" && BuildNum == "" {
		fmt.Println("No version information found")
		return
	}

	if Version != "" {
		fmt.Printf("Version: %s\n", Version)
	}

	if Commit != "" {
		c := Commit
		if len(c) > 7 {
			c = c[:7]
		}
		fmt.Printf("Commit:  %s\n", c)
	}

	if BuildNum != "" {
		fmt.Printf("Build:   %s\n", BuildNum)
	}

	if Time != "" {
		fmt.Printf("Time:    %s\n", Time)
	}
}
