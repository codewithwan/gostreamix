package stream

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"time"

	"github.com/codewithwan/gostreamix/internal/domain/stream/ffmpeg"
	"github.com/codewithwan/gostreamix/internal/infrastructure/ws"
	"go.uber.org/zap"
)

type pipeline struct {
	pm   *ProcessManager
	hub  *ws.Hub
	log  *zap.Logger
	repo Repository
}

func NewPipeline(pm *ProcessManager, hub *ws.Hub, log *zap.Logger, repo Repository) Pipeline {
	return &pipeline{
		pm:   pm,
		hub:  hub,
		log:  log,
		repo: repo,
	}
}

func (p *pipeline) Start(ctx context.Context, s *Stream, videoPaths []string) error {
	p.log.Info("Starting pipeline", zap.String("stream_id", s.ID.String()))
	p.emitLog("info", "pipeline_starting", s.ID, "Preparing ffmpeg pipeline")

	if _, running := p.pm.Get(s.ID); running {
		return ErrStreamAlreadyRunning
	}

	if len(videoPaths) == 0 {
		return ErrStreamProgramEmpty
	}
	for _, videoPath := range videoPaths {
		if _, err := os.Stat(videoPath); err != nil {
			p.log.Error("Video file not found", zap.String("path", videoPath), zap.Error(err))
			p.emitLog("error", "video_missing", s.ID, "Video source not found")
			return fmt.Errorf("video file not found at %s: %w", videoPath, err)
		}
	}

	builder := ffmpeg.NewCommandBuilder().
		WithBitrate(s.Bitrate).
		WithResolution(s.Resolution).
		WithFPS(s.FPS).
		WithLoop(s.Loop).
		WithDestinations(s.RTMPTargets)

	cleanup := func() {}
	if len(videoPaths) == 1 {
		builder.WithInput(videoPaths[0])
	} else {
		playlistPath, err := writeConcatPlaylist(videoPaths)
		if err != nil {
			return fmt.Errorf("create playlist file: %w", err)
		}
		cleanup = func() {
			_ = os.Remove(playlistPath)
		}
		builder.WithConcatFile(playlistPath)
	}

	args, err := builder.Build()
	if err != nil {
		cleanup()
		return fmt.Errorf("failed to build ffmpeg command: %w", err)
	}

	p.log.Info("Executing ffmpeg", zap.Strings("args", args))
	cmd := exec.Command("ffmpeg", args...)
	stderr, err := cmd.StderrPipe()
	if err != nil {
		cleanup()
		return fmt.Errorf("failed to create stderr pipe: %w", err)
	}

	proc := p.pm.Register(s.ID, cmd)

	if err := cmd.Start(); err != nil {
		p.pm.Unregister(s.ID)
		cleanup()
		p.log.Error("Failed to start ffmpeg", zap.Error(err))
		p.emitLog("error", "pipeline_start_failed", s.ID, "Failed to start ffmpeg")
		return fmt.Errorf("failed to start ffmpeg: %w", err)
	}

	proc.SetStatus(StatusRunning)
	p.updateStoredStatus(context.Background(), s.ID, StatusRunning)
	p.hub.Broadcast("stream_status", map[string]interface{}{
		"stream_id": s.ID.String(),
		"status":    "running",
	})
	p.emitLog("info", "pipeline_running", s.ID, "Pipeline is live")

	go p.monitorProcess(proc, s.ID, stderr, cleanup)

	return nil
}

func (p *pipeline) Stop(ctx context.Context, s *Stream) error {
	proc, ok := p.pm.Get(s.ID)
	if !ok {
		return nil
	}
	p.emitLog("info", "pipeline_stopping", s.ID, "Stopping pipeline")

	proc.SetStatus(StatusStopping)
	p.updateStoredStatus(ctx, s.ID, StatusStopping)
	p.hub.Broadcast("stream_status", map[string]interface{}{
		"stream_id": s.ID.String(),
		"status":    "stopping",
	})

	if err := proc.Cmd.Process.Signal(os.Interrupt); err != nil {
		return proc.Cmd.Process.Kill()
	}

	select {
	case <-time.After(5 * time.Second):
		if err := proc.Cmd.Process.Kill(); err != nil {
			return err
		}
		<-proc.Done
		return nil
	case <-ctx.Done():
		return ctx.Err()
	case <-proc.Done:
		return nil
	}
}

func (p *pipeline) Reload(ctx context.Context, s *Stream, videoPaths []string) error {
	p.emitLog("info", "pipeline_reload", s.ID, "Applying live changes")

	if err := p.Stop(ctx, s); err != nil {
		p.emitLog("error", "pipeline_reload_failed", s.ID, "Failed to stop previous process")
		return fmt.Errorf("stop old process: %w", err)
	}

	deadline := time.Now().Add(5 * time.Second)
	for {
		if _, running := p.pm.Get(s.ID); !running {
			break
		}
		if time.Now().After(deadline) {
			return fmt.Errorf("timeout waiting old process to exit")
		}
		time.Sleep(100 * time.Millisecond)
	}

	if err := p.Start(ctx, s, videoPaths); err != nil {
		p.emitLog("error", "pipeline_reload_failed", s.ID, "Failed to start reloaded process")
		return fmt.Errorf("start reloaded process: %w", err)
	}

	p.emitLog("info", "pipeline_reloaded", s.ID, "Live changes applied")
	return nil
}
