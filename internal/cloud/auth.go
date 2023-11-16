package cloud

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/pkg/errors"
	"gopkg.in/yaml.v3"
)

var ErrNoCurrentSession = errors.New("no current session")

func GetCurrent() (*AuthSession, error) {
	config, err := ReactAuthConfig()
	if err != nil {
		return nil, errors.Wrap(err, "get auth config")
	}

	for _, session := range config.Sessions {
		if session.AccountID == config.Current {
			return &session, nil
		}
	}

	return nil, ErrNoCurrentSession
}

const signInMessage = `Visit this URL on this device to log in:`

// SignIn starts the sign in http server on a random port and return the port.
func startSignInServer(ctx context.Context, handle http.Handler) (int, error) {
	handler := http.NewServeMux()
	handler.Handle("/", handle)

	server := &http.Server{
		Handler:           handler,
		ReadTimeout:       5 * time.Second,  // Maximum duration for reading the entire request, including the body.
		WriteTimeout:      10 * time.Second, // Maximum duration before timing out writes of the response.
		IdleTimeout:       15 * time.Second, // Maximum amount of time to wait for the next request when keep-alives are enabled.
		ReadHeaderTimeout: 1 * time.Second,  // Time to wait for request headers is set to 1 second
	}

	listener, err := net.Listen("tcp", "localhost:0")
	if err != nil {
		return 0, errors.Wrap(err, "listen")
	}

	port := listener.Addr().(*net.TCPAddr).Port

	go func() {
		if err := server.Serve(listener); err != nil {
			panic(err)
		}
	}()

	go func() {
		<-ctx.Done()

		// Use a context with a timeout to give active connections a chance to finish.
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if err := server.Shutdown(shutdownCtx); err != nil {
			panic(err)
		}
	}()

	return port, nil
}

func SignIn(ctx context.Context) (*AuthSession, error) {
	codeCh := make(chan string)

	port, err := startSignInServer(ctx, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		fmt.Fprint(w, signupCallbackPage)

		codeCh <- r.URL.Query().Get("code")
	}))
	if err != nil {
		return nil, errors.Wrap(err, "start sign in server")
	}

	fmt.Fprintln(os.Stderr, signInMessage)

	uri, err := url.Parse(CloudAccountLinkingURL())
	if err != nil {
		return nil, errors.Wrap(err, "parse account linking url")
	}

	query := uri.Query()
	query.Set("redirect", fmt.Sprintf("http://localhost:%d", port))
	uri.RawQuery = query.Encode()

	fmt.Fprintf(os.Stderr, "\n     %s\n\n", uri.String())

	code := <-codeCh
	fmt.Println(code)

	return nil, nil
}

type AuthConfig struct {
	Current  string        `yaml:"current"`
	Sessions []AuthSession `yaml:"sessions"`
}

type AuthSession struct {
	AccountID string `yaml:"id"`
	Token     string `yaml:"token"`
}

// ReactAuthConfig parses the auth config file.
func ReactAuthConfig() (*AuthConfig, error) {
	content, err := os.ReadFile(CloudAuthConfigFile())
	if err != nil {
		return nil, errors.Wrap(err, "read config file")
	}

	conf := &AuthConfig{}
	err = yaml.Unmarshal(content, &conf)
	if err != nil {
		return nil, errors.Wrap(err, "unmarshal config")
	}

	return conf, nil
}

// WriteAuthConfig writes the auth config file.
func WriteAuthConfig(conf *AuthConfig) error {
	content, err := yaml.Marshal(conf)
	if err != nil {
		return errors.Wrap(err, "marshal config")
	}

	err = os.WriteFile(CloudAuthConfigFile(), content, 0o600)
	if err != nil {
		return errors.Wrap(err, "write config file")
	}

	return nil
}

const signupCallbackPage = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account connection</title>

  <style>
    body {
      margin: 0;
      font-family: sans-serif;
    }

    .center {
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
  </style>
</head>
<body>
  <div class="center">
    <h2>You can safely close this window</h2>
    <p>The empirica command line is finishing signup.</p>
  </div>
</body>
</html>`
