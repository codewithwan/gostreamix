package ffmpeg

var ResolutionPresets = map[string]StreamSettings{
	"360p":    {Resolution: "640x360", Bitrate: 800, FPS: 30},
	"480p":    {Resolution: "854x480", Bitrate: 1500, FPS: 30},
	"720p":    {Resolution: "1280x720", Bitrate: 2500, FPS: 30},
	"1080p":   {Resolution: "1920x1080", Bitrate: 4500, FPS: 30},
	"1080p60": {Resolution: "1920x1080", Bitrate: 6000, FPS: 60},
}
