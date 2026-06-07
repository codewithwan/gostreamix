package stream

import "github.com/google/uuid"

func normalizeStreamSlices(streamData *Stream) {
	if streamData == nil {
		return
	}
	if streamData.RTMPTargets == nil {
		streamData.RTMPTargets = []string{}
	}
}

func normalizeProgramSlices(program *StreamProgram) {
	if program == nil {
		return
	}
	if program.VideoIDs == nil {
		program.VideoIDs = []uuid.UUID{}
	}
	if program.RTMPTargets == nil {
		program.RTMPTargets = []string{}
	}
}
