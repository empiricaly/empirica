//go:build tools
// +build tools

// package tools is a place to list all tools used in go generate and tests, so
// that `go mod tidy` will not shoot down all those deps.
package tools

import (
	_ "github.com/go-bindata/go-bindata"
)
