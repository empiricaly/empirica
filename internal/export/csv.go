package export

import (
	"archive/zip"
	"encoding/csv"
	"os"
	"strings"

	"github.com/pkg/errors"
	"github.com/rs/zerolog/log"
)

const fileDefaultPerms = 0o644

func ExportCSV(tajfile, filename string) error {
	kinds, err := prepare(tajfile)
	if err != nil {
		return errors.Wrap(err, "prepare export")
	}

	file, err := os.OpenFile(filename, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, fileDefaultPerms)
	if err != nil {
		return errors.Wrap(err, "open file")
	}
	defer file.Close()

	z := zip.NewWriter(file)

	for _, kind := range kinds {
		log.Info().
			Int("count", len(kind.Scopes)).
			Int("keys", len(kind.Keys)).
			Msgf("Exporting %s", kind.Name)

		zf, err := z.Create(camelCase(kind.Name) + ".csv")
		if err != nil {
			return errors.Wrap(err, "create file in zip")
		}

		w := csv.NewWriter(zf)

		fields := []string{"id"}

		for _, key := range kind.Keys {
			fields = append(fields, key, key+"LastChangedAt")
		}

		if err := w.Write(fields); err != nil {
			return errors.Wrap(err, "write csv")
		}

		for _, scope := range kind.Scopes {
			fields := []string{scope.ID}

			for _, key := range kind.Keys {
				attribute, ok := scope.Attributes[key]
				if !ok {
					fields = append(fields, "", "")

					continue
				}

				if attribute.IsVector {
					b := "[" + strings.Join(attribute.Values, ",") + "]"

					fields = append(fields, b)
				} else {
					fields = append(fields, attribute.Value)
				}

				fields = append(fields, attribute.Last)
			}

			if err := w.Write(fields); err != nil {
				return errors.Wrap(err, "write csv")
			}
		}

		w.Flush()

		if err := w.Error(); err != nil {
			return errors.Wrap(err, "write csv")
		}
	}

	if err := z.Close(); err != nil {
		return errors.Wrap(err, "close zip")
	}

	return nil
}
