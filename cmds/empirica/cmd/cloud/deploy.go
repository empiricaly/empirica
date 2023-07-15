package cloudcmd

import (
	"crypto/tls"
	"fmt"
	"io"
	"io/ioutil"
	"mime/multipart"
	"net/http"
	"os"
	"path"

	"github.com/davecgh/go-spew/spew"
	"github.com/empiricaly/empirica/internal/bundle"
	"github.com/empiricaly/empirica/internal/settings"
	"github.com/pkg/errors"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

const randPkgNameLen = 10

func AddDeployCommand(parent *cobra.Command) error {
	cmd := &cobra.Command{
		Use:           "deploy",
		Short:         "Deploy project to Empirica Cloud",
		SilenceUsage:  true,
		SilenceErrors: true,
		Hidden:        true,
		Args:          cobra.NoArgs,
		RunE: func(_ *cobra.Command, _ []string) error {
			ctx := initContext()

			out := viper.GetString("bundle")
			projectID := viper.GetString("projectID")

			if projectID == "" {
				projectIDFile := path.Join(".empirica", "id")
				content, err := os.ReadFile(projectIDFile)
				if err != nil {
					return errors.Wrap(err, "read project id")
				}

				projectID = string(content)
			}

			if out != "" {
				if _, err := os.Stat(out); err != nil {
					return errors.Wrap(err, "check bundle path")
				}
			} else {
				out = path.Join(os.TempDir(), randSeq(randPkgNameLen)) + ".zstd"

				conf := getConfig()

				if err := settings.InstallVoltaIfNeeded(ctx); err != nil {
					return errors.Wrap(err, "check node")
				}

				err := bundle.Bundle(ctx, conf, out, false)
				if err != nil {
					return errors.Wrap(err, "bundle project")
				}

				defer os.Remove(out)
			}

			spew.Dump(out)

			err := postBundle(projectID, out, viper.GetString("apiEndpoint"))
			if err != nil {
				return errors.Wrap(err, "post bundle")
			}

			return nil
		},
	}

	cmd.Flags().String("projectID", "", "Project ID, defaults to .empirica/id")
	cmd.Flags().String("bundle", "", "Send a pre-bundled project at path")
	cmd.Flags().String("apiEndpoint", "https://mission.support/project", "Send a pre-bundled project at path")

	cmd.Flags().Lookup("projectID").Hidden = true
	cmd.Flags().Lookup("apiEndpoint").Hidden = true

	err := viper.BindPFlags(cmd.Flags())
	if err != nil {
		return errors.Wrap(err, "bind bundle flags")
	}

	parent.AddCommand(cmd)

	return nil
}

func postBundle(projectID, bundle, apiEndpoint string) error {
	// Open the file you want to upload
	file, err := os.Open(bundle)
	if err != nil {
		return errors.Wrap(err, "open bundle")
	}
	defer file.Close()

	fmt.Println("Uploading bundle...")

	reader, writer := io.Pipe()
	multipartWriter := multipart.NewWriter(writer)

	var streamErr error
	go func() {
		defer writer.Close()

		multipartWriter.WriteField("projectID", projectID)

		// Create a form field for the file
		fileWriter, err := multipartWriter.CreateFormFile("file", "bundle.zstd")
		if err != nil {
			streamErr = errors.Wrap(err, "create form field")
			return
		}

		// Copy the file contents to the form field
		_, err = io.Copy(fileWriter, file)
		if err != nil {
			streamErr = errors.Wrap(err, "copy file contents")
			return
		}

		// Close the multipart writer to signal the end of the form data
		if err := multipartWriter.Close(); err != nil {
			streamErr = errors.Wrap(err, "close multipart writer")
			return
		}
	}()

	request, err := http.NewRequest("POST", apiEndpoint, reader)
	if err != nil {
		return errors.Wrap(err, "create http request")
	}
	request.Header.Set("Content-Type", multipartWriter.FormDataContentType())

	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}

	client := &http.Client{
		Transport: tr,
	}
	response, err := client.Do(request)
	if err != nil {
		return errors.Wrap(err, "send http request")
	}
	defer response.Body.Close()

	if streamErr != nil {
		return streamErr
	}

	resbody, err := ioutil.ReadAll(response.Body)
	if err != nil {
		return errors.Wrap(err, "read response body")
	}

	if response.StatusCode != http.StatusOK {
		fmt.Println("")
		fmt.Println("Error:")
		fmt.Println("")
		fmt.Println("  " + string(resbody))
		fmt.Println("")
		return errors.Errorf("unexpected status code: %d", response.StatusCode)
	} else {
		fmt.Println("")
		fmt.Println("Success:")
		fmt.Println("")
		fmt.Println("  " + string(resbody))
		fmt.Println("")
	}

	return nil
}
