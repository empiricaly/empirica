package experiment

import (
	"encoding/json"
	"os"
	"strings"

	"golang.org/x/text/cases"
	"golang.org/x/text/language"
	// "github.com/davecgh/go-spew/spew"
)

type SimpleComponent struct {
	Name     string          `json:"name,omitempty" yaml:"name,omitempty"`
	Empirica *PackageVersion `json:"empirica,omitempty" yaml:"empirica,omitempty"`
}

func (c *SimpleComponent) String() string {
	caser := cases.Title(language.AmericanEnglish)

	return caser.String(c.Name) + ":  " + c.Empirica.String()
}

func GetSimpleComponent(full bool) []*SimpleComponent {
	comps := []*SimpleComponent{}

	for _, name := range []string{"client", "server"} {
		dir := "./" + name

		v := GetVersion(dir, EmpiricaPackageName)
		if v != nil {
			comps = append(comps, &SimpleComponent{
				Name:     name,
				Empirica: v,
			})
		}
	}

	return comps
}

type PackageVersion struct {
	Configured string `json:"configured,omitempty" yaml:"configured,omitempty"`
	Requested  string `json:"requested,omitempty" yaml:"requested,omitempty"`
	Resolved   string `json:"resolved,omitempty" yaml:"resolved,omitempty"`
}

func (v *PackageVersion) String() string {
	if v == nil {
		return "not found"
	}

	if strings.TrimPrefix(v.Configured, "^") == v.Resolved && strings.TrimPrefix(v.Requested, "^") == v.Resolved {
		return v.Resolved
	}

	return v.Configured + " -> " + v.Requested + " -> " + v.Resolved
}

const EmpiricaPackageName = "@empirica/core"

func GetVersion(dir, pkg string) *PackageVersion {
	pkgj, _, err := getPackageJSON(dir)
	if err != nil {
		return nil
	}

	version := new(PackageVersion)

	for dep, v := range pkgj.Dependencies {
		if dep == pkg {
			version.Configured = v

			break
		}
	}

	pkgl, _, err := getPackageLock(dir)
	if err != nil {
		return version
	}

	mainPkg, ok := pkgl.Packages[""]
	if ok {
		for dep, v := range mainPkg.Dependencies {
			if dep == pkg {
				version.Requested = v

				break
			}
		}
	}

	// spew.Dump(pkgl.Packages)

	givenPkg, ok := pkgl.Dependencies[pkg]
	if ok {
		version.Resolved = givenPkg.Version
	}

	return version
}

func getPackageJSON(dir string) (*PackageJSON, string, error) {
	out, err := os.ReadFile(dir + "/package.json")
	if err != nil {
		return nil, "", err
	}

	var pkg PackageJSON
	if err := json.Unmarshal(out, &pkg); err != nil {
		return nil, "", err
	}

	return &pkg, string(out), nil
}

type PackageJSON struct {
	Name            string            `json:"name"`
	Scripts         map[string]string `json:"scripts"`
	Dependencies    map[string]string `json:"dependencies"`
	DevDependencies map[string]string `json:"devDependencies"`
	Volta           map[string]string `json:"volta"`
}

func getPackageLock(dir string) (*PackageLock, string, error) {
	out, err := os.ReadFile(dir + "/package-lock.json")
	if err != nil {
		return nil, "", err
	}

	var pkg PackageLock
	if err := json.Unmarshal(out, &pkg); err != nil {
		return nil, "", err
	}

	return &pkg, string(out), nil
}

type PackageLock struct {
	Name         string                        `json:"name"`
	Packages     map[string]PackageLockPackage `json:"packages"`
	Dependencies map[string]PackageLockDep     `json:"dependencies"`
}

type PackageLockPackage struct {
	Name            string            `json:"name"`
	Version         string            `json:"version"`
	Dependencies    map[string]string `json:"dependencies"`
	DevDependencies map[string]string `json:"devDependencies"`
	Requires        map[string]string `json:"requires"`
}

type PackageLockDep struct {
	Version   string            `json:"version"`
	Resolved  string            `json:"resolved"`
	Integrity string            `json:"integrity"`
	Requires  map[string]string `json:"requires"`
}

// {
//   "name": "react",
//   "version": "0.0.0",
//   "lockfileVersion": 2,
//   "requires": true,
//   "packages": {
//     "": {
//       "name": "react",
//       "version": "0.0.0",
//       "dependencies": {
//         "@empirica/core": "latest",
//         "@react-hook/mouse-position": "4.1.3",
//         "react": "18.2.0",
//         "react-dom": "18.2.0"
//       },
//       "devDependencies": {
//         "@types/react": "18.0.14",
//         "@types/react-dom": "18.0.5",
//         "@vitejs/plugin-react-refresh": "1.3.6",
//         "autoprefixer": "10.4.7",
//         "path": "0.12.7",
//         "vite": "2.9.12",
//         "vite-plugin-restart": "0.1.1",
//         "vite-plugin-windicss": "1.8.4"
//       }
//     },

// "@empirica/core": {
//   "version": "1.0.0-beta.1",
//   "resolved": "https://registry.npmjs.org/@empirica/core/-/core-1.0.0-beta.1.tgz",
//   "integrity": "sha512-XWjGSxZclLtaWI4xkPXAjI8jnRhQ2ao6pEjzH3dvIRLHz4wTj+/vaeRucMrDcz1k1lPejVBzzIOXqwDRpxMRCQ==",
//   "requires": {
//     "@empirica/tajriba": "^1.0.0-alpha.4",
//     "@react-hook/mouse-position": "4.1.3",
//     "@swc/helpers": "0.4.2",
//     "rxjs": "7.5.5",
//     "zod": "3.17.3"
//   }
// },
