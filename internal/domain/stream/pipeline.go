package stream

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/codewithwan/gostreamix/internal/domain/stream/ffmpeg"
	"github.com/codewithwan/gostreamix/internal/infrastructure/ws"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type pipeline struct {
	pm  *ProcessManager
	hub *ws.Hub
	log *zap.Logger
}

func NewPipeline(pm *ProcessManager, hub *ws.Hub, log *zap.Logger) Pipeline {
	return &pipeline{
		pm:  pm,
		hub: hub,
		log: log,
	}
}

func (p *pipeline) Start(ctx context.Context, s *Stream, videoPath string) error {
	p.log.Info("Starting pipeline", zap.String("stream_id", s.ID.String()))

	if _, running := p.pm.Get(s.ID); running {
		return fmt.Errorf("stream %s is already running", s.ID.String())
	}

	if _, err := os.Stat(videoPath); err != nil {
		p.log.Error("Video file not found", zap.String("path", videoPath), zap.Error(err))
		return fmt.Errorf("video file not found at %s: %w", videoPath, err)
	}

	builder := ffmpeg.NewCommandBuilder().
		WithInput(videoPath).
		WithBitrate(s.Bitrate).
		WithResolution(s.Resolution).
		WithFPS(s.FPS).
		WithLoop(s.Loop).
		WithDestinations(s.RTMPTargets)

	args, err := builder.Build()
	if err != nil {
		return fmt.Errorf("failed to build ffmpeg command: %w", err)
	}

	p.log.Info("Executing ffmpeg", zap.Strings("args", args))
	cmd := exec.Command("ffmpeg", args...)
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("failed to create stderr pipe: %w", err)
	}

	proc := p.pm.Register(s.ID, cmd)

	if err := cmd.Start(); err != nil {
		p.pm.Unregister(s.ID)
		p.log.Error("Failed to start ffmpeg", zap.Error(err))
		return fmt.Errorf("failed to start ffmpeg: %w", err)
	}

	proc.SetStatus(StatusRunning)
	p.hub.Broadcast("stream_status", map[string]interface{}{
		"stream_id": s.ID.String(),
		"status":    "running",
	})

	go p.monitorProcess(proc, s.ID, stderr)

	return nil
}

func (p *pipeline) monitorProcess(proc *Process, streamID uuid.UUID, stderr io.ReadCloser) {
	defer stderr.Close()
	defer p.pm.Unregister(streamID)

	scanner := bufio.NewScanner(stderr)
	var processLog []string

	for scanner.Scan() {
		line := scanner.Text()
		if progress := ffmpeg.ParseProgress(line); progress != nil {
			proc.UpdateProgress(progress)
			p.hub.Broadcast("stream_progress", map[string]interface{}{
				"stream_id": streamID.String(),
				"progress":  progress,
			})
		} else {
			// Log other ffmpeg output for debugging
			p.log.Info("ffmpeg output", zap.String("stream_id", streamID.String()), zap.String("line", line))

			// Keep last 10 lines for error context
			processLog = append(processLog, line)
			if len(processLog) > 10 {
				processLog = processLog[1:]
			}
		}
	}

	status := StatusStopped
	if err := proc.Cmd.Wait(); err != nil {
		errorContext := ""
		if len(processLog) > 0 {
			errorContext = fmt.Sprintf("\nLast output lines:\n%s", strings.Join(processLog, "\n"))
		}
		p.log.Error("ffmpeg exited with error",
			zap.String("stream_id", streamID.String()),
			zap.Error(err),
			zap.String("context", errorContext),
		)
		status = StatusError
	} else {
		p.log.Info("ffmpeg exited successfully", zap.String("stream_id", streamID.String()))
	}

	proc.SetStatus(status)
	p.hub.Broadcast("stream_status", map[string]interface{}{
		"stream_id": streamID.String(),
		"status":    status,
	})
}

func (p *pipeline) Stop(ctx context.Context, s *Stream) error {
	proc, ok := p.pm.Get(s.ID)
	if !ok {
		return nil
	}

	proc.SetStatus(StatusStopping)
	p.hub.Broadcast("stream_status", map[string]interface{}{
		"stream_id": s.ID.String(),
		"status":    "stopping",
	})

	if err := proc.Cmd.Process.Signal(os.Interrupt); err != nil {
		return proc.Cmd.Process.Kill()
	}

	done := make(chan error, 1)
	go func() {
		done <- nil
	}()

	select {
	case <-time.After(5 * time.Second):
		return proc.Cmd.Process.Kill()
	case <-ctx.Done():
		return ctx.Err()
	case <-done:
		return nil
	}
}
