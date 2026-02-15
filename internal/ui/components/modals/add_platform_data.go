package modals

type PlatformConfig struct {
	ID          string
	Name        string
	RTMPURL     string
	ColorClass  string // For text color (icon)
	BgClass     string // For background when selected (e.g. bg-red-500/10)
	BorderClass string // For border when selected (e.g. border-red-500)
	IconSVG     string // The inner path of the SVG
}

var AvailablePlatforms = []PlatformConfig{
	{
		ID:          "youtube",
		Name:        "YouTube Live",
		RTMPURL:     "rtmp://a.rtmp.youtube.com/live2",
		ColorClass:  "text-red-600",
		BgClass:     "bg-red-500/10",
		BorderClass: "border-red-500",
		IconSVG:     `<path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/>`,
	},
	{
		ID:          "twitch",
		Name:        "Twitch",
		RTMPURL:     "rtmp://live.twitch.tv/app",
		ColorClass:  "text-purple-500",
		BgClass:     "bg-purple-500/10",
		BorderClass: "border-purple-500",
		IconSVG:     `<path d="M21 2H3v16h5v4l4-4h5l4-4V2zm-10 9V7m5 4V7"/>`,
	},
	{
		ID:          "facebook",
		Name:        "Facebook Live",
		RTMPURL:     "rtmps://live-api-s.facebook.com:443/rtmp/",
		ColorClass:  "text-blue-600",
		BgClass:     "bg-blue-600/10",
		BorderClass: "border-blue-600",
		IconSVG:     `<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>`,
	},
	{
		ID:          "tiktok",
		Name:        "TikTok Live",
		RTMPURL:     "rtmp://push-rtmp-l11-h5-1.tiktokcdn.com/game",
		ColorClass:  "text-pink-500",
		BgClass:     "bg-pink-500/10",
		BorderClass: "border-pink-500",
		IconSVG:     `<path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/>`,
	},
	// {
	// 	ID:          "instagram",
	// 	Name:        "Instagram Live",
	// 	RTMPURL:     "",
	// 	ColorClass:  "text-pink-600",
	// 	BgClass:     "bg-pink-600/10",
	// 	BorderClass: "border-pink-600",
	// 	IconSVG:     `<rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>`,
	// },
	// {
	// 	ID:          "x",
	// 	Name:        "X / Twitter",
	// 	RTMPURL:     "",
	// 	ColorClass:  "text-foreground",
	// 	BgClass:     "bg-foreground/10",
	// 	BorderClass: "border-foreground",
	// 	IconSVG:     `<path d="M4 4l11.733 16h4.267l-11.733-16zM4 20l6.768-6.768M20 4l-6.768 6.768"/>`,
	// },
	{
		ID:          "kick",
		Name:        "Kick",
		RTMPURL:     "rtmps://stream.kick.com/app",
		ColorClass:  "text-green-500",
		BgClass:     "bg-green-500/10",
		BorderClass: "border-green-500",
		IconSVG:     `<path d="M4 4h16v16H4zM8 8v8h2v-2h2v-2h-2V8H8zm6 0v8h4v-2h-2v-2h2v-2h-2V8h-2z"/>`,
	},
	{
		ID:          "custom",
		Name:        "Custom RTMP",
		RTMPURL:     "",
		ColorClass:  "text-blue-500",
		BgClass:     "bg-blue-500/10",
		BorderClass: "border-blue-500",
		IconSVG:     `<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>`,
	},
}
