package video

import "errors"

var (
	ErrVideoNotFound         = errors.New("video not found")
	ErrVideoProcessingFailed = errors.New("failed to process video")
)
