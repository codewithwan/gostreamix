package stream

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func writeConcatPlaylist(videoPaths []string) (string, error) {
	if err := os.MkdirAll(filepath.Join("tmp", "playlists"), 0755); err != nil {
		return "", err
	}

	file, err := os.CreateTemp(filepath.Join("tmp", "playlists"), "stream-*.ffconcat")
	if err != nil {
		return "", err
	}
	defer file.Close()

	for _, videoPath := range videoPaths {
		abs, err := filepath.Abs(videoPath)
		if err != nil {
			return "", err
		}
		escaped := strings.ReplaceAll(filepath.ToSlash(abs), "'", "\\'")
		if _, err := fmt.Fprintf(file, "file '%s'\n", escaped); err != nil {
			return "", err
		}
	}

	return file.Name(), nil
}
