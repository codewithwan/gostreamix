package stream

import "errors"

var (
	ErrStreamNotFound       = errors.New("stream not found")
	ErrStreamAlreadyRunning = errors.New("stream already running")
	ErrInvalidRTMPTarget    = errors.New("invalid RTMP target")
	ErrStreamProgramEmpty   = errors.New("stream program has no videos")
)
