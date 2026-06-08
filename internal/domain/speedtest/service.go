package speedtest

import (
	"context"
	"time"

	gospeedtest "github.com/showwin/speedtest-go/speedtest"
	"go.uber.org/zap"
)

type service struct {
	log *zap.Logger
}

func NewService(log *zap.Logger) Service {
	return &service{log: log}
}

func (s *service) RunTest(ctx context.Context) (<-chan SpeedtestMsg, error) {
	ch := make(chan SpeedtestMsg, 100)

	go func() {
		defer close(ch)

		select {
		case ch <- SpeedtestMsg{Phase: "ping"}:
		case <-ctx.Done():
			return
		}

		client := gospeedtest.New()
		user, err := client.FetchUserInfo()
		if err != nil {
			s.log.Error("failed to fetch speedtest user info", zap.Error(err))
			s.sendErr(ctx, ch)
			return
		}

		serverList, err := client.FetchServers()
		if err != nil {
			s.log.Error("failed to fetch speedtest servers", zap.Error(err))
			s.sendErr(ctx, ch)
			return
		}

		targets, err := serverList.FindServer([]int{})
		if err != nil || len(targets) == 0 {
			s.log.Error("failed to find speedtest target server", zap.Error(err))
			s.sendErr(ctx, ch)
			return
		}

		targetServer := targets[0]
		err = targetServer.PingTestContext(ctx, nil)
		if err != nil {
			s.log.Error("speedtest ping test failed", zap.Error(err))
			s.sendErr(ctx, ch)
			return
		}

		s.sendMsg(ctx, ch, SpeedtestMsg{
			Phase:         "download",
			Ping:          targetServer.Latency.Milliseconds(),
			ServerName:    targetServer.Name,
			ServerCountry: targetServer.Country,
			ServerSponsor: targetServer.Sponsor,
			ClientIp:      user.IP,
			ClientIsp:     user.Isp,
		})

		var lastUpdate time.Time

		client.SetCallbackDownload(func(downRate gospeedtest.ByteRate) {
			now := time.Now()
			if now.Sub(lastUpdate) > 100*time.Millisecond {
				s.sendMsg(ctx, ch, SpeedtestMsg{
					Phase:         "download",
					DownloadSpeed: downRate.Mbps(),
					Ping:          targetServer.Latency.Milliseconds(),
					ServerName:    targetServer.Name,
					ServerCountry: targetServer.Country,
					ServerSponsor: targetServer.Sponsor,
					ClientIp:      user.IP,
					ClientIsp:     user.Isp,
				})
				lastUpdate = now
			}
		})

		client.SetCallbackUpload(func(upRate gospeedtest.ByteRate) {
			now := time.Now()
			if now.Sub(lastUpdate) > 100*time.Millisecond {
				s.sendMsg(ctx, ch, SpeedtestMsg{
					Phase:         "upload",
					UploadSpeed:   upRate.Mbps(),
					Ping:          targetServer.Latency.Milliseconds(),
					ServerName:    targetServer.Name,
					ServerCountry: targetServer.Country,
					ServerSponsor: targetServer.Sponsor,
					ClientIp:      user.IP,
					ClientIsp:     user.Isp,
				})
				lastUpdate = now
			}
		})

		err = targetServer.DownloadTestContext(ctx)
		if err != nil {
			s.log.Error("speedtest download test failed", zap.Error(err))
			s.sendErr(ctx, ch)
			return
		}

		s.sendMsg(ctx, ch, SpeedtestMsg{
			Phase:         "upload",
			DownloadSpeed: targetServer.DLSpeed.Mbps(),
			Ping:          targetServer.Latency.Milliseconds(),
			ServerName:    targetServer.Name,
			ServerCountry: targetServer.Country,
			ServerSponsor: targetServer.Sponsor,
			ClientIp:      user.IP,
			ClientIsp:     user.Isp,
		})

		lastUpdate = time.Now()
		err = targetServer.UploadTestContext(ctx)
		if err != nil {
			s.log.Error("speedtest upload test failed", zap.Error(err))
			s.sendErr(ctx, ch)
			return
		}

		s.sendMsg(ctx, ch, SpeedtestMsg{
			Phase:         "done",
			DownloadSpeed: targetServer.DLSpeed.Mbps(),
			UploadSpeed:   targetServer.ULSpeed.Mbps(),
			Ping:          targetServer.Latency.Milliseconds(),
			ServerName:    targetServer.Name,
			ServerCountry: targetServer.Country,
			ServerSponsor: targetServer.Sponsor,
			ClientIp:      user.IP,
			ClientIsp:     user.Isp,
		})
	}()

	return ch, nil
}

func (s *service) sendMsg(ctx context.Context, ch chan<- SpeedtestMsg, msg SpeedtestMsg) {
	select {
	case ch <- msg:
	case <-ctx.Done():
	}
}

func (s *service) sendErr(ctx context.Context, ch chan<- SpeedtestMsg) {
	s.sendMsg(ctx, ch, SpeedtestMsg{Phase: "error"})
}
