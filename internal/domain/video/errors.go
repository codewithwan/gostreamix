package video

import "errors"

var (
	ErrVideoNotFound         = errors.New("video not found")
	ErrVideoProcessingFailed = errors.New("failed to process video")
	ErrVideoDuplicateName    = errors.New("video name already exists in this folder")
)
