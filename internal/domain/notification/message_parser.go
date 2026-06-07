package notification

import "strings"

type parsedMsg struct {
	Header    string
	Stream    string
	Status    string
	Trigger   string
	Detail    string
	Time      string
	HasFields bool
}

func parseMessage(message string) parsedMsg {
	lines := strings.Split(message, "\n")
	res := parsedMsg{}
	if len(lines) == 0 {
		return res
	}
	res.Header = strings.TrimSpace(lines[0])

	for _, line := range lines[1:] {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, ":", 2)
		if len(parts) < 2 {
			continue
		}
		key := strings.ToLower(strings.TrimSpace(parts[0]))
		val := strings.TrimSpace(parts[1])
		switch key {
		case "stream":
			res.Stream = val
			res.HasFields = true
		case "status":
			res.Status = val
			res.HasFields = true
		case "trigger", "pemicu":
			res.Trigger = val
			res.HasFields = true
		case "detail":
			res.Detail = val
			res.HasFields = true
		case "time", "waktu":
			res.Time = val
			res.HasFields = true
		}
	}
	return res
}

// cleanHeader strips the [GoStreamix] prefix and whitespace.
func cleanHeader(header string) string {
	header = strings.ReplaceAll(header, "[GoStreamix]", "")
	header = strings.ReplaceAll(header, "[gostreamix]", "")
	return strings.TrimSpace(header)
}

// statusEmoji returns an emoji and embed color for the given status string.
func statusEmoji(status string) (emoji string, color int, statusDisplay string) {
	switch strings.ToLower(status) {
	case "error":
		return "🔴", 15875907, "🔴 error"
	case "running", "active", "started":
		return "🟢", 2336090, "🟢 " + status
	case "starting":
		return "🟢", 2336090, "🟡 starting"
	case "stopping":
		return "🟢", 2336090, "🟡 stopping"
	case "stopped":
		return "🟢", 2336090, "⚪ stopped"
	default:
		return "🔔", 5793010, status
	}
}
