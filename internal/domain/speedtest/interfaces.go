package speedtest

import (
	"context"
)

type SpeedtestMsg struct {
	Phase         string  `json:"phase"`
	Ping          int64   `json:"ping,omitempty"`
	DownloadSpeed float64 `json:"downloadSpeed,omitempty"`
	UploadSpeed   float64 `json:"uploadSpeed,omitempty"`
	ServerName    string  `json:"serverName,omitempty"`
	ServerCountry string  `json:"serverCountry,omitempty"`
	ServerSponsor string  `json:"serverSponsor,omitempty"`
	ClientIp      string  `json:"clientIp,omitempty"`
	ClientIsp     string  `json:"clientIsp,omitempty"`
}

type Service interface {
	RunTest(ctx context.Context) (<-chan SpeedtestMsg, error)
}
