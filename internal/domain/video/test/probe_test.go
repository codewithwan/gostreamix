package test

import (
	"os"
	"os/exec"
	"path/filepath"
	"testing"

	"github.com/codewithwan/gostreamix/internal/domain/video"
)

func TestProbeVideoRejectsNonVideoFile(t *testing.T) {
	if _, err := exec.LookPath("ffprobe"); err != nil {
		t.Skip("ffprobe not available")
	}

	path := filepath.Join(t.TempDir(), "not-video.mp4")
	if err := os.WriteFile(path, []byte("not a video"), 0644); err != nil {
		t.Fatal(err)
	}

	if _, err := video.ProbeVideo(path); err == nil {
		t.Fatal("expected ffprobe to reject non-video content")
	}
}

func TestProbeVideoRequiresVideoStream(t *testing.T) {
	if _, err := exec.LookPath("ffmpeg"); err != nil {
		t.Skip("ffmpeg not available")
	}
	if _, err := exec.LookPath("ffprobe"); err != nil {
		t.Skip("ffprobe not available")
	}

	path := filepath.Join(t.TempDir(), "audio-only.mp4")
	cmd := exec.Command("ffmpeg", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=1000:duration=1", "-y", path)
	if err := cmd.Run(); err != nil {
		t.Fatalf("create audio-only fixture: %v", err)
	}

	if _, err := video.ProbeVideo(path); err == nil {
		t.Fatal("expected audio-only media to be rejected because it has no video stream")
	}
}
