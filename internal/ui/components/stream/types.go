package stream

import "github.com/google/uuid"

type StreamView struct {
	ID          uuid.UUID
	Name        string
	RTMPTargets []string
	Bitrate     int
	Resolution  string
	Status      string
}
