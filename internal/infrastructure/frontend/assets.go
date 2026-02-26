package frontend

import (
	"embed"
	"io/fs"
)

//go:embed all:build
var buildFS embed.FS

func StaticFS() (fs.FS, error) {
	return fs.Sub(buildFS, "build")
}

func ReadIndex() ([]byte, error) {
	return buildFS.ReadFile("build/index.html")
}
