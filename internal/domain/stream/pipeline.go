package stream

import (
	"context"
	"fmt"
)

type pipeline struct {
}

func NewPipeline() Pipeline {
	return &pipeline{}
}

func (p *pipeline) Start(ctx context.Context, s *Stream) error {
	fmt.Printf("Starting pipeline for stream: %s\n", s.Name)
	return nil
}

func (p *pipeline) Stop(ctx context.Context, s *Stream) error {
	fmt.Printf("Stopping pipeline for stream: %s\n", s.Name)
	return nil
}
