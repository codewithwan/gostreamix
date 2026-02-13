package ffmpeg

type Progress struct {
	Frame   int
	FPS     float64
	Time    string
	Bitrate string
	Speed   float64
}

type StreamSettings struct {
	Resolution string
	Bitrate    int
	FPS        int
}
