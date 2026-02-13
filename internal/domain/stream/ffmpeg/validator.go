package ffmpeg

import (
	"os/exec"
)

func CheckFFmpeg() bool {
	if _, err := exec.LookPath("ffmpeg"); err != nil {
		return false
	}
	if _, err := exec.LookPath("ffprobe"); err != nil {
		return false
	}
	return true
}
