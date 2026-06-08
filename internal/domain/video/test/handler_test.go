package test

import (
	"bytes"
	"context"
	"mime/multipart"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"testing"

	"github.com/codewithwan/gostreamix/internal/domain/video"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type stubVideoService struct {
	processCalled bool
	lastDTO       video.ProcessVideoDTO
	video         *video.Video
}

func (s *stubVideoService) GetVideos(ctx context.Context) ([]*video.Video, error) {
	return nil, nil
}

func (s *stubVideoService) ProcessVideo(ctx context.Context, dto video.ProcessVideoDTO) (*video.Video, error) {
	s.processCalled = true
	s.lastDTO = dto
	if s.video != nil {
		return s.video, nil
	}
	return &video.Video{ID: uuid.New(), Filename: dto.Filename, OriginalName: dto.OriginalName, Duration: dto.Metadata.Duration}, nil
}

func (s *stubVideoService) GetVideo(ctx context.Context, id uuid.UUID) (*video.Video, error) {
	if s.video != nil && s.video.ID == id {
		return s.video, nil
	}
	return nil, video.ErrVideoNotFound
}

func (s *stubVideoService) RenameVideo(ctx context.Context, id uuid.UUID, dto video.RenameVideoDTO) (*video.Video, error) {
	return nil, nil
}

func (s *stubVideoService) MoveVideo(ctx context.Context, id uuid.UUID, dto video.MoveVideoDTO) (*video.Video, error) {
	return nil, nil
}

func (s *stubVideoService) CopyVideo(ctx context.Context, id uuid.UUID, dto video.MoveVideoDTO) (*video.Video, error) {
	return nil, nil
}

func (s *stubVideoService) DeleteVideo(ctx context.Context, id uuid.UUID) error {
	return nil
}

func TestApiUploadVideoRejectsInvalidExtension(t *testing.T) {
	t.Chdir(t.TempDir())
	app, svc := videoUploadTestApp()

	body, contentType := multipartBody(t, "video", "clip.txt", "video/mp4", []byte("not video"))
	req := httptest.NewRequest("POST", "/api/videos/upload", body)
	req.Header.Set("Content-Type", contentType)
	resp, err := app.Test(req, -1)

	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != fiber.StatusBadRequest {
		t.Fatalf("expected 400, got %d", resp.StatusCode)
	}
	if svc.processCalled {
		t.Fatal("ProcessVideo should not be called for invalid extensions")
	}
}

func TestApiUploadVideoRejectsInvalidMIME(t *testing.T) {
	t.Chdir(t.TempDir())
	app, svc := videoUploadTestApp()

	body, contentType := multipartBody(t, "video", "clip.mp4", "application/octet-stream", []byte("not video"))
	req := httptest.NewRequest("POST", "/api/videos/upload", body)
	req.Header.Set("Content-Type", contentType)
	resp, err := app.Test(req, -1)

	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != fiber.StatusBadRequest {
		t.Fatalf("expected 400, got %d", resp.StatusCode)
	}
	if svc.processCalled {
		t.Fatal("ProcessVideo should not be called for invalid MIME")
	}
}

func TestApiUploadVideoRejectsNonVideoContentAndCleansTemp(t *testing.T) {
	t.Chdir(t.TempDir())
	app, svc := videoUploadTestApp()

	body, contentType := multipartBody(t, "video", "clip.mp4", "video/mp4", []byte("not video"))
	req := httptest.NewRequest("POST", "/api/videos/upload", body)
	req.Header.Set("Content-Type", contentType)
	resp, err := app.Test(req, -1)

	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != fiber.StatusBadRequest {
		t.Fatalf("expected 400, got %d", resp.StatusCode)
	}
	if svc.processCalled {
		t.Fatal("ProcessVideo should not be called when ffprobe rejects the file")
	}
	assertUploadDirHasNoTempFiles(t)
}

func TestApiUploadVideoAcceptsValidVideo(t *testing.T) {
	requireFFmpeg(t)
	t.Chdir(t.TempDir())
	app, svc := videoUploadTestApp()

	source := filepath.Join(t.TempDir(), "sample.mp4")
	makeSampleVideo(t, source)
	payload, err := os.ReadFile(source)
	if err != nil {
		t.Fatal(err)
	}

	body, contentType := multipartBody(t, "video", "sample.mp4", "video/mp4", payload)
	req := httptest.NewRequest("POST", "/api/videos/upload", body)
	req.Header.Set("Content-Type", contentType)
	resp, err := app.Test(req, -1)

	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != fiber.StatusCreated {
		t.Fatalf("expected 201, got %d", resp.StatusCode)
	}
	if !svc.processCalled {
		t.Fatal("ProcessVideo should be called for valid videos")
	}
	if svc.lastDTO.Metadata == nil {
		t.Fatal("expected probed metadata to be passed into ProcessVideo")
	}
	if _, err := os.Stat(svc.lastDTO.Path); err != nil {
		t.Fatalf("expected finalized upload to exist: %v", err)
	}
	assertUploadDirHasNoTempFiles(t)
}

func TestApiGetVideoFileLooksUpVideoByID(t *testing.T) {
	t.Chdir(t.TempDir())
	videoID := uuid.New()

	app := fiber.New()
	defer func() { _ = app.Shutdown() }()
	handler := video.NewHandler(&stubVideoService{video: &video.Video{ID: videoID, Filename: "missing.mp4"}}, nil, zap.NewNop())
	handler.Routes(app)

	req := httptest.NewRequest("GET", "/api/videos/"+videoID.String()+"/file", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != fiber.StatusNotFound {
		t.Fatalf("expected 404 for missing file after authenticated lookup, got %d", resp.StatusCode)
	}
}

func TestApiGetVideoFileRejectsTraversalFilename(t *testing.T) {
	t.Chdir(t.TempDir())
	videoID := uuid.New()

	app := fiber.New()
	handler := video.NewHandler(&stubVideoService{video: &video.Video{ID: videoID, Filename: "../secret.mp4"}}, nil, zap.NewNop())
	handler.Routes(app)

	req := httptest.NewRequest("GET", "/api/videos/"+videoID.String()+"/file", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != fiber.StatusBadRequest {
		t.Fatalf("expected 400 for unsafe filename, got %d", resp.StatusCode)
	}
}

func videoUploadTestApp() (*fiber.App, *stubVideoService) {
	app := fiber.New()
	svc := &stubVideoService{}
	handler := video.NewHandler(svc, nil, zap.NewNop())
	handler.Routes(app)
	return app, svc
}

func multipartBody(t *testing.T, field, filename, contentType string, payload []byte) (*bytes.Buffer, string) {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreatePart(map[string][]string{
		"Content-Disposition": {`form-data; name="` + field + `"; filename="` + filename + `"`},
		"Content-Type":        {contentType},
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := part.Write(payload); err != nil {
		t.Fatal(err)
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
	return &body, writer.FormDataContentType()
}

func requireFFmpeg(t *testing.T) {
	t.Helper()
	if _, err := exec.LookPath("ffmpeg"); err != nil {
		t.Skip("ffmpeg not available")
	}
	if _, err := exec.LookPath("ffprobe"); err != nil {
		t.Skip("ffprobe not available")
	}
}

func makeSampleVideo(t *testing.T, path string) {
	t.Helper()
	cmd := exec.Command("ffmpeg", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=16x16:rate=1", "-t", "1", "-pix_fmt", "yuv420p", "-y", path)
	if err := cmd.Run(); err != nil {
		t.Fatalf("create sample video: %v", err)
	}
}

func assertUploadDirHasNoTempFiles(t *testing.T) {
	t.Helper()
	files, err := filepath.Glob(filepath.Join("data", "uploads", "*.upload*"))
	if err != nil {
		t.Fatal(err)
	}
	if len(files) != 0 {
		t.Fatalf("expected temp files to be cleaned up, found %v", files)
	}
}
