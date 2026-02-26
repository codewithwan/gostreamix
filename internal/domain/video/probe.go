package video

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
)

func ProbeVideo(path string) (*Metadata, error) {
	args := []string{
		"-v", "quiet",
		"-print_format", "json",
		"-show_format",
		"-show_streams",
		path,
	}

	cmd := exec.Command("ffprobe", args...)
	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("ffprobe failed: %w", err)
	}

	var data struct {
		Format struct {
			Duration string `json:"duration"`
			Bitrate  string `json:"bit_rate"`
		} `json:"format"`
		Streams []struct {
			CodecType string `json:"codec_type"`
			Width     int    `json:"width"`
			Height    int    `json:"height"`
			AvgFPS    string `json:"avg_frame_rate"`
		} `json:"streams"`
	}

	if err := json.Unmarshal(out, &data); err != nil {
		return nil, fmt.Errorf("failed to parse ffprobe output: %w", err)
	}

	meta := &Metadata{}
	d, _ := strconv.ParseFloat(data.Format.Duration, 64)
	meta.Duration = int(d)
	b, _ := strconv.Atoi(data.Format.Bitrate)
	meta.Bitrate = b / 1000

	for _, s := range data.Streams {
		if s.CodecType == "video" {
			meta.Resolution = fmt.Sprintf("%dx%d", s.Width, s.Height)
			if s.AvgFPS != "" && s.AvgFPS != "0/0" {
				parts := strings.Split(s.AvgFPS, "/")
				if len(parts) == 2 {
					num, _ := strconv.ParseFloat(parts[0], 64)
					den, _ := strconv.ParseFloat(parts[1], 64)
					if den != 0 {
						meta.FPS = int(num / den)
					}
				}
			}
			break
		}
	}

	return meta, nil
}

func GenerateThumbnail(videoPath, thumbPath string) error {
	dir := filepath.Dir(thumbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	attempts := [][]string{
		{
			"-hide_banner",
			"-loglevel", "error",
			"-i", videoPath,
			"-vf", "thumbnail,scale=640:-1",
			"-frames:v", "1",
			"-q:v", "2",
			"-y",
			thumbPath,
		},
		{
			"-hide_banner",
			"-loglevel", "error",
			"-ss", "00:00:01",
			"-i", videoPath,
			"-vframes", "1",
			"-q:v", "2",
			"-y",
			thumbPath,
		},
		{
			"-hide_banner",
			"-loglevel", "error",
			"-ss", "00:00:00",
			"-i", videoPath,
			"-vframes", "1",
			"-q:v", "2",
			"-y",
			thumbPath,
		},
	}

	var lastErr error
	for _, args := range attempts {
		cmd := exec.Command("ffmpeg", args...)
		if err := cmd.Run(); err == nil {
			return nil
		} else {
			lastErr = err
		}
	}

	return lastErr
}
