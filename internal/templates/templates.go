package templates

import (
	"encoding/json"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"

	"github.com/pkg/errors"
)

//go:generate go-bindata -ignore=node_modules|trigger|yarn-error.log|.DS_Store -pkg templates -prefix data data/...

// CopyDir restores assets to the given directory recursively.
func CopyDir(project, dir, root string) error {
	children, err := AssetDir(root)
	if err != nil {
		return errors.Wrap(err, "root should be dir")
	}

	for _, child := range children {
		err = CopyAssets(project, dir, root, child)
		if err != nil {
			return err
		}
	}

	return nil
}

// RestoreAssets restores an asset under the given directory recursively.
func CopyAssets(project, dir, root, name string) error {
	children, err := AssetDir(filepath.Join(root, name))
	if err != nil {
		return CopyAsset(project, dir, root, name)
	}

	for _, child := range children {
		err = CopyAssets(project, dir, root, filepath.Join(name, child))
		if err != nil {
			return err
		}
	}

	return nil
}

// RestoreAsset restores an asset under the given directory.
func CopyAsset(project, dir, root, name string) error {
	a := filepath.Join(root, name)

	data, err := Asset(a)
	if err != nil {
		return errors.Wrap(err, "get asset")
	}

	info, err := AssetInfo(a)
	if err != nil {
		return errors.Wrap(err, "get asset info")
	}

	p := _filePath(dir, name)

	d := filepath.Dir(p)
	base := filepath.Base(p)

	if err := os.MkdirAll(d, os.FileMode(0755)); err != nil {
		return errors.Wrap(err, "mkdir asset path")
	}

	if base == "package.json" {
		obj := map[string]interface{}{}
		if err := json.Unmarshal(data, &obj); err != nil {
			return errors.Wrap(err, "read package.json")
		}

		delete(obj, "license")
		delete(obj, "author")
		obj["private"] = true

		if strings.Contains(base, "client") {
			obj["name"] = project + "-empirica-client"
		} else {
			obj["name"] = project + "-empirica-server"
		}

		data, err = json.MarshalIndent(obj, "", "  ")
		if err != nil {
			return errors.Wrap(err, "write package.json")
		}
	}

	if err := ioutil.WriteFile(p, data, info.Mode()); err != nil {
		return errors.Wrap(err, "write asset")
	}

	return err
}
