package ffmpeg

import (
	"fmt"
	"strings"
)

type CommandBuilder struct {
	inputFile    string
	bitrate      int
	resolution   string
	fps          int
	loop         bool
	destinations []string
	preset       string
}

func NewCommandBuilder() *CommandBuilder {
	return &CommandBuilder{
		bitrate:    2500,
		resolution: "1280x720",
		fps:        30,
		loop:       true,
		preset:     "veryfast",
	}
}

func (b *CommandBuilder) WithInput(file string) *CommandBuilder {
	b.inputFile = file
	return b
}

func (b *CommandBuilder) WithBitrate(bitrate int) *CommandBuilder {
	b.bitrate = bitrate
	return b
}

func (b *CommandBuilder) WithResolution(res string) *CommandBuilder {
	b.resolution = res
	return b
}

func (b *CommandBuilder) WithFPS(fps int) *CommandBuilder {
	b.fps = fps
	return b
}

func (b *CommandBuilder) WithLoop(loop bool) *CommandBuilder {
	b.loop = loop
	return b
}

func (b *CommandBuilder) WithDestinations(dest []string) *CommandBuilder {
	b.destinations = dest
	return b
}

func (b *CommandBuilder) WithPreset(p string) *CommandBuilder {
	b.preset = p
	return b
}

func (b *CommandBuilder) Build() ([]string, error) {
	if b.inputFile == "" {
		return nil, fmt.Errorf("input file is required")
	}
	if len(b.destinations) == 0 {
		return nil, fmt.Errorf("at least one destination is required")
	}

	args := []string{"-re"}

	if b.loop {
		args = append(args, "-stream_loop", "-1")
	}

	args = append(args, "-thread_queue_size", "1024", "-i", b.inputFile)

	bitrateVal := b.bitrate
	if bitrateVal == 0 {
		bitrateVal = 2500
	}
	bitrateStr := fmt.Sprintf("%dk", bitrateVal)
	bufSize := fmt.Sprintf("%dk", bitrateVal*2)

	fpsVal := b.fps
	if fpsVal == 0 {
		fpsVal = 30
	}

	args = append(args,
		"-c:v", "libx264",
		"-preset", b.preset,
		"-tune", "zerolatency",
		"-profile:v", "high",
		"-b:v", bitrateStr,
		"-maxrate", bitrateStr,
		"-minrate", bitrateStr,
		"-bufsize", bufSize,
		"-pix_fmt", "yuv420p",
		"-g", fmt.Sprintf("%d", fpsVal*2),
		"-r", fmt.Sprintf("%d", fpsVal),
	)

	vf := fmt.Sprintf("scale=%s", b.resolution)
	args = append(args, "-vf", vf)
	args = append(args,
		"-c:a", "aac",
		"-ac", "2",
		"-ar", "44100",
		"-b:a", "128k",
	)

	args = append(args,
		"-f", "tee",
		"-map", "0:v",
		"-map", "0:a",
	)

	destStrings := make([]string, len(b.destinations))
	for i, d := range b.destinations {
		destStrings[i] = fmt.Sprintf("[f=flv:onfail=ignore]%s", d)
	}
	teeArg := strings.Join(destStrings, "|")
	args = append(args, teeArg)

	return args, nil
}
