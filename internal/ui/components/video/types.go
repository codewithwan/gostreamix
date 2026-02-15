package video

import "github.com/google/uuid"

type VideoView struct {
	ID        uuid.UUID
	Filename  string
	Size      int64
	Thumbnail string
	Duration  int
}
