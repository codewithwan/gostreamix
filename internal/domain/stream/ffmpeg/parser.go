package ffmpeg

import (
	"regexp"
	"strconv"
	"strings"
)

var (
	frameReg   = regexp.MustCompile(`frame=\s*(\d+)`)
	fpsReg     = regexp.MustCompile(`fps=\s*([\d.]+)`)
	timeReg    = regexp.MustCompile(`time=\s*([\d:.]+)`)
	bitrateReg = regexp.MustCompile(`bitrate=\s*([\d.kM]+bits/s)`)
	speedReg   = regexp.MustCompile(`speed=\s*([\d.]+)x`)
)

func ParseProgress(line string) *Progress {
	if !strings.Contains(line, "frame=") || !strings.Contains(line, "time=") {
		return nil
	}

	p := &Progress{}

	if m := frameReg.FindStringSubmatch(line); len(m) > 1 {
		p.Frame, _ = strconv.Atoi(m[1])
	}
	if m := fpsReg.FindStringSubmatch(line); len(m) > 1 {
		p.FPS, _ = strconv.ParseFloat(m[1], 64)
	}
	if m := timeReg.FindStringSubmatch(line); len(m) > 1 {
		p.Time = m[1]
	}
	if m := bitrateReg.FindStringSubmatch(line); len(m) > 1 {
		p.Bitrate = m[1]
	}
	if m := speedReg.FindStringSubmatch(line); len(m) > 1 {
		p.Speed, _ = strconv.ParseFloat(m[1], 64)
	}

	return p
}
