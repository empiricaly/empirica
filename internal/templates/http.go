package templates

import (
	"bytes"
	"net/http"
	"os"
	"strings"
	"time"
)

func HTTPFS(asset string) *HTTPFileServer {
	return &HTTPFileServer{asset}
}

type HTTPFileServer struct {
	asset string
}

func (f *HTTPFileServer) fixName(name string) string {
	if name == "/" {
		name = f.asset
	} else {
		if strings.HasPrefix(name, "/") {
			name = f.asset + name
		} else {
			name = f.asset + "/" + name
		}
	}

	if len(name) > 0 && name[0] == '/' {
		name = name[1:]
	}

	return name
}

// Open implements http.FileSystem interface.
func (f *HTTPFileServer) Open(name string) (http.File, error) {
	name = f.fixName(name)

	if content, err := Asset(name); err == nil {
		return &httpFile{name: name, Reader: bytes.NewReader(content)}, nil
	}

	children, err := AssetDir(name)
	if err != nil {
		// If the error is not found, return an error that will
		// result in a 404 error. Otherwise the server returns
		// a 500 error for files not found.
		if strings.Contains(err.Error(), "not found") {
			return nil, os.ErrNotExist
		}

		return nil, err
	}

	cfi := make([]os.FileInfo, 0, len(children))

	for _, child := range children {
		childPath := name + "/" + child

		if info, err := AssetInfo(childPath); err != nil {
			cfi = append(cfi, dirFileInfo(childPath))
		} else {
			cfi = append(cfi, info)
		}
	}

	return &httpFile{name: name, cfi: cfi}, nil
}

type httpFile struct {
	*bytes.Reader
	name      string
	cfi       []os.FileInfo
	cfiOffset int
}

// Close no need do anything.
func (f *httpFile) Close() error {
	return nil
}

// Readdir read dir's children file info.
func (f *httpFile) Readdir(count int) ([]os.FileInfo, error) {
	if len(f.cfi) == 0 {
		return nil, os.ErrNotExist
	}

	if count <= 0 {
		return f.cfi, nil
	}

	if f.cfiOffset+count > len(f.cfi) {
		count = len(f.cfi) - f.cfiOffset
	}

	offset := f.cfiOffset
	f.cfiOffset += count

	return f.cfi[offset : offset+count], nil
}

// Stat read file info from http item.
func (f *httpFile) Stat() (os.FileInfo, error) {
	if len(f.cfi) != 0 {
		return dirFileInfo(f.name), nil
	}

	return AssetInfo(f.name)
}

// dirFileInfo return default dir file info.
func dirFileInfo(name string) os.FileInfo {
	return &fileStat{
		name:    name,
		size:    0,
		mode:    os.FileMode(2147484068), // equal os.FileMode(0644)|os.ModeDir
		modTime: time.Time{},
	}
}

// A fileStat is the implementation of FileInfo returned by Stat and Lstat.
type fileStat struct {
	name    string
	size    int64
	mode    os.FileMode
	modTime time.Time
}

func (fs *fileStat) Name() string       { return fs.name }
func (fs *fileStat) Size() int64        { return fs.size }
func (fs *fileStat) Mode() os.FileMode  { return fs.mode }
func (fs *fileStat) ModTime() time.Time { return fs.modTime }
func (fs *fileStat) Sys() interface{}   { return nil }
func (fs *fileStat) IsDir() bool        { return false }
