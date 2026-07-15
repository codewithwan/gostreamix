package stream

import (
	"bufio"
	"bytes"
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
	// ffmpeg reports progress with carriage returns (no newline), so the
	// default line scanner would buffer forever until it trips the 64KB
	// ErrTooLong limit, stop draining stderr, and stall ffmpeg (stream dies
	// after a fixed time). Split on \r as well and raise the max token size.
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	scanner.Split(scanLinesOrCR)
	var processLog []string
	for scanner.Scan() {
		processLog = p.handleProcessLine(proc, streamID, scanner.Text(), processLog)
	}

	status := p.waitForProcess(proc, streamID, processLog)
	proc.SetStatus(status)
	p.updateStoredStatus(context.Background(), streamID, status)
	p.hub.Broadcast("stream_status", map[string]interface{}{"stream_id": streamID.String(), "status": status})
	p.notifyStreamStatus(streamID, status, proc.GetLastError())
}

// scanLinesOrCR is a bufio.SplitFunc that breaks tokens on '\n' or '\r',
// so ffmpeg's carriage-return-delimited progress updates are delivered as
// individual lines instead of accumulating into one oversized token.
func scanLinesOrCR(data []byte, atEOF bool) (advance int, token []byte, err error) {
	if atEOF && len(data) == 0 {
		return 0, nil, nil
	}
	if i := bytes.IndexAny(data, "\r\n"); i >= 0 {
		return i + 1, data[:i], nil
	}
	if atEOF {
		return len(data), data, nil
	}
	return 0, nil, nil
}

// notifyStreamStatus emits a Discord/Telegram notification when a pipeline
// terminates, resolving the stream name for a friendlier message.
func (p *pipeline) notifyStreamStatus(streamID uuid.UUID, status ProcessStatus, lastErr string) {
	name := streamID.String()
	if p.repo != nil {
		if s, err := p.repo.GetByID(context.Background(), streamID); err == nil && s != nil && s.Name != "" {
			name = s.Name
		}
	}

	event := "process_exit"
	detail := "Pipeline stopped"
	if status == StatusError {
		event = "ffmpeg_error"
		detail = strings.TrimSpace(lastErr)
		if detail == "" {
			detail = "ffmpeg exited unexpectedly"
		}
	}
	p.notify(name, string(status), event, detail)
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
	err := proc.Cmd.Wait()
	// A non-zero exit caused by our own stop signal (SIGINT/kill) is an
	// intentional shutdown, not a failure — report it as stopped.
	if err != nil && proc.GetStatus() == StatusStopping {
		p.log.Info("ffmpeg stopped on request", zap.String("stream_id", streamID.String()))
		p.emitLog("info", "pipeline_stopped", streamID, "Pipeline stopped")
		return StatusStopped
	}
	if err != nil {
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
