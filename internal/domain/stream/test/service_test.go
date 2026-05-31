package test

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/codewithwan/gostreamix/internal/domain/stream"
	"github.com/codewithwan/gostreamix/internal/domain/video"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

type fakeStreamRepo struct {
	stream  *stream.Stream
	program *stream.StreamProgram
	updated *stream.Stream
}

func (r *fakeStreamRepo) Create(ctx context.Context, s *stream.Stream) error {
	r.stream = s
	return nil
}

func (r *fakeStreamRepo) GetByID(ctx context.Context, id uuid.UUID) (*stream.Stream, error) {
	return r.stream, nil
}

func (r *fakeStreamRepo) List(ctx context.Context) ([]*stream.Stream, error) {
	return []*stream.Stream{r.stream}, nil
}

func (r *fakeStreamRepo) Update(ctx context.Context, s *stream.Stream) error {
	r.updated = s
	r.stream = s
	return nil
}

func (r *fakeStreamRepo) Delete(ctx context.Context, id uuid.UUID) error {
	r.stream = nil
	return nil
}

func (r *fakeStreamRepo) GetProgram(ctx context.Context, streamID uuid.UUID) (*stream.StreamProgram, error) {
	return r.program, nil
}

func (r *fakeStreamRepo) UpsertProgram(ctx context.Context, p *stream.StreamProgram) error {
	r.program = p
	return nil
}

type fakeVideoRepo struct {
	videos map[uuid.UUID]*video.Video
}

func (r *fakeVideoRepo) Create(ctx context.Context, v *video.Video) error {
	r.videos[v.ID] = v
	return nil
}

func (r *fakeVideoRepo) GetByID(ctx context.Context, id uuid.UUID) (*video.Video, error) {
	return r.videos[id], nil
}

func (r *fakeVideoRepo) List(ctx context.Context) ([]*video.Video, error) {
	videos := make([]*video.Video, 0, len(r.videos))
	for _, v := range r.videos {
		videos = append(videos, v)
	}
	return videos, nil
}

func (r *fakeVideoRepo) Update(ctx context.Context, v *video.Video) error {
	r.videos[v.ID] = v
	return nil
}

func (r *fakeVideoRepo) Delete(ctx context.Context, id uuid.UUID) error {
	delete(r.videos, id)
	return nil
}

type fakePipeline struct {
	startedPaths []string
}

func (p *fakePipeline) Start(ctx context.Context, s *stream.Stream, videoPaths []string) error {
	p.startedPaths = append([]string(nil), videoPaths...)
	return nil
}

func (p *fakePipeline) Stop(ctx context.Context, s *stream.Stream) error {
	return nil
}

func (p *fakePipeline) Reload(ctx context.Context, s *stream.Stream, videoPaths []string) error {
	p.startedPaths = append([]string(nil), videoPaths...)
	return nil
}

func TestStreamService_StartStreamUsesFullProgramQueue(t *testing.T) {
	ctx := context.Background()
	streamID := uuid.New()
	firstID := uuid.New()
	secondID := uuid.New()

	createUploadFile(t, "first.mp4")
	createUploadFile(t, "second.mp4")

	repo := &fakeStreamRepo{
		stream: &stream.Stream{
			ID:          streamID,
			Name:        "Launch",
			VideoID:     firstID,
			RTMPTargets: []string{"rtmp://example.com/live/key"},
			Bitrate:     3000,
			Resolution:  "1280x720",
			FPS:         30,
			Loop:        true,
			Status:      "idle",
		},
		program: &stream.StreamProgram{
			StreamID:    streamID,
			VideoIDs:    []uuid.UUID{firstID, secondID},
			RTMPTargets: []string{"rtmp://example.com/live/key"},
			Bitrate:     3000,
			Resolution:  "1280x720",
		},
	}
	videoRepo := &fakeVideoRepo{videos: map[uuid.UUID]*video.Video{
		firstID:  {ID: firstID, Filename: "first.mp4", OriginalName: "first.mp4"},
		secondID: {ID: secondID, Filename: "second.mp4", OriginalName: "second.mp4"},
	}}
	pipeline := &fakePipeline{}

	svc := stream.NewService(repo, videoRepo, pipeline, stream.NewProcessManager())

	err := svc.StartStream(ctx, streamID)
	assert.NoError(t, err)
	assert.Equal(t, []string{
		filepath.Join("data", "uploads", "first.mp4"),
		filepath.Join("data", "uploads", "second.mp4"),
	}, pipeline.startedPaths)
}

func TestStreamService_SaveProgramRejectsMissingSourceFile(t *testing.T) {
	ctx := context.Background()
	streamID := uuid.New()
	videoID := uuid.New()

	repo := &fakeStreamRepo{
		stream: &stream.Stream{
			ID:          streamID,
			Name:        "Launch",
			VideoID:     videoID,
			RTMPTargets: []string{"rtmp://example.com/live/key"},
			Bitrate:     3000,
			Resolution:  "1280x720",
			FPS:         30,
			Loop:        true,
			Status:      "idle",
		},
	}
	videoRepo := &fakeVideoRepo{videos: map[uuid.UUID]*video.Video{
		videoID: {ID: videoID, Filename: "missing.mp4", OriginalName: "missing.mp4"},
	}}
	svc := stream.NewService(repo, videoRepo, &fakePipeline{}, stream.NewProcessManager())

	program, err := svc.SaveProgram(ctx, streamID, stream.SaveProgramDTO{
		Name:        "Launch",
		VideoIDs:    []uuid.UUID{videoID},
		RTMPTargets: []string{"rtmp://example.com/live/key"},
		Bitrate:     3000,
		Resolution:  "1280x720",
	})

	assert.Nil(t, program)
	assert.ErrorContains(t, err, "source file")
}

func createUploadFile(t *testing.T, name string) {
	t.Helper()
	path := filepath.Join("data", "uploads", name)
	assert.NoError(t, os.MkdirAll(filepath.Dir(path), 0755))
	assert.NoError(t, os.WriteFile(path, []byte("test"), 0644))
	t.Cleanup(func() {
		_ = os.Remove(path)
	})
}
