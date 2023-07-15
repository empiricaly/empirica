package cloud

import (
	"os"
	"path"

	"github.com/empiricaly/empirica/internal/settings"
)

const (
	apiEmulatorBaseURL     = "http://127.0.0.1:9092/empirica-cloud/us-central1"
	apiProductionBaseURL   = "http://127.0.0.1:9092/empirica-cloud/us-central1"
	apiEnvBaseURL          = "EMPIRICA_CLOUD_API_BASE_URL"
	webEmulatorBaseURL     = "http://127.0.0.1:9092/empirica-cloud/us-central1"
	webProductionBaseURL   = "http://127.0.0.1:9092/empirica-cloud/us-central1"
	webEnvBaseURL          = "EMPIRICA_CLOUD_WEB_BASE_URL"
	envEmulator            = "EMPIRICA_CLOUD_EMULATOR"
	dashBasePath           = "dash"
	accountLinkingBasePath = "link"
)

// CloudConfigDir returns the path to the cloud config directory.
func CloudConfigDir() string {
	return path.Join(settings.ConfigHomeDir(), "cloud")
}

// CloudAuthConfigDir returns the path to the cloud auth config directory.
func CloudAuthConfigFile() string {
	return path.Join(CloudConfigDir(), "auth.yaml")
}

// baseURL returns the base URL to the cloud API.
func apiBaseURL() string {
	envBaseURLResolved := os.Getenv(apiEnvBaseURL)

	if envBaseURLResolved != "" {
		return envBaseURLResolved
	} else if os.Getenv(envEmulator) != "" {
		return apiEmulatorBaseURL
	} else {
		return apiProductionBaseURL
	}
}

// CloudAPIURL returns the URL to the cloud API.
func CloudAPIURL(endpoint string) string {
	return path.Join(apiBaseURL(), endpoint)
}

// baseURL returns the base URL to the cloud API.
func webBaseURL() string {
	envBaseURLResolved := os.Getenv(webEnvBaseURL)

	if envBaseURLResolved != "" {
		return envBaseURLResolved
	} else if os.Getenv(envEmulator) != "" {
		return webEmulatorBaseURL
	} else {
		return webProductionBaseURL
	}
}

// CloudWebURL returns the URL to the cloud website.
func CloudWebURL(endpoint string) string {
	return path.Join(webBaseURL(), endpoint)
}

// CloudDashURL returns the URL to the cloud web dashboard.
func CloudDashURL(endpoint string) string {
	return path.Join(CloudWebURL(dashBasePath), endpoint)
}

// CloudDashURL returns the URL to the cloud web dashboard.
func CloudAccountLinkingURL() string {
	return CloudDashURL(accountLinkingBasePath)
}
