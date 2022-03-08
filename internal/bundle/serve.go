package bundle

import (
	"context"

	"github.com/empiricaly/empirica"
)

func Serve(ctx context.Context, conf *empirica.Config, in string, clean bool) error {
	_, err := Unbundle(ctx, conf, in, clean)

	return err
}
