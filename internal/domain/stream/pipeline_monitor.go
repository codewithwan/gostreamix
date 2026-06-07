package stream

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/codewithwan/gostreamix/internal/domain/stream/ffmpeg"
	"github.com/codewithwan/gostreamix/internal/infrastructure/activity"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

func (p *pipeline) monitorProcess(proc *Process, streamID uuid.UUID, stderr io.ReadCloser, cleanup func()) {
	defer stderr.Close()
	defer cleanup()
	defer close(proc.Done)
	defer p.pm.Unregister(streamID)

	scanner := bufio.NewScanner(stderr)
	var processLog []string
	for scanner.Scan() {
		processLog = p.handleProcessLine(proc, streamID, scanner.Text(), processLog)
	}

	status := p.waitForProcess(proc, streamID, processLog)
	proc.SetStatus(status)
	p.updateStoredStatus(context.Background(), streamID, status)
	p.hub.Broadcast("stream_status", map[string]interface{}{"stream_id": streamID.String(), "status": status})
}

func (p *pipeline) handleProcessLine(proc *Process, streamID uuid.UUID, line string, processLog []string) []string {
	if progress := ffmpeg.ParseProgress(line); progress != nil {
		proc.UpdateProgress(progress)
		p.hub.Broadcast("stream_progress", map[string]interface{}{"stream_id": streamID.String(), "progress": progress})
		return processLog
	}

	p.log.Info("ffmpeg output", zap.String("stream_id", streamID.String()), zap.String("line", line))
	proc.AppendOutput(line)
	processLog = append(processLog, line)
	if len(processLog) > 10 {
		processLog = processLog[1:]
	}

	if looksLikeFFmpegError(line) {
		proc.SetLastError(line)
		activity.Record(activity.Entry{
			Timestamp: time.Now().UTC(),
			Source:    "ffmpeg",
			Level:     "error",
			Event:     "stderr",
			Message:   line,
			StreamID:  streamID.String(),
		})
	}
	return processLog
}

func (p *pipeline) waitForProcess(proc *Process, streamID uuid.UUID, processLog []string) ProcessStatus {
	if err := proc.Cmd.Wait(); err != nil {
		errorContext := ""
		if len(processLog) > 0 {
			errorContext = fmt.Sprintf("\nLast output lines:\n%s", strings.Join(processLog, "\n"))
		}
		p.log.Error("ffmpeg exited with error", zap.String("stream_id", streamID.String()), zap.Error(err), zap.String("context", errorContext))
		p.emitLog("error", "pipeline_error", streamID, "ffmpeg exited with error")
		proc.SetLastError(strings.TrimSpace(fmt.Sprintf("%v%s", err, errorContext)))
		return StatusError
	}

	p.log.Info("ffmpeg exited successfully", zap.String("stream_id", streamID.String()))
	p.emitLog("info", "pipeline_stopped", streamID, "Pipeline stopped")
	return StatusStopped
}
