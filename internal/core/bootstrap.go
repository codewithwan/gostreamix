package core

import (
	"fmt"
	"net/http"
	"time"

	"github.com/codewithwan/gostreamix/internal/infrastructure/monitor"
	"github.com/codewithwan/gostreamix/internal/infrastructure/server"
	"github.com/codewithwan/gostreamix/internal/infrastructure/ws"
	"go.uber.org/dig"
	"go.uber.org/zap"
)

func Bootstrap(c *dig.Container) error {
	return c.Invoke(func(s *server.Server, l *zap.Logger, hub *ws.Hub) {
		appURL := s.Config.AppURL
		if appURL == "http://localhost:8080" && s.Config.Host == "0.0.0.0" {
			appURL = fmt.Sprintf("http://localhost:%s", s.Config.Port)
		}

		printBanner(s.Config.Port, s.Config.DBPath, appURL)

		go func() {
			ticker := time.NewTicker(5 * time.Second)
			for range ticker.C {
				stats := monitor.GetStats()
				hub.Broadcast("system_stats", stats)
			}
		}()

		go func() {
			time.Sleep(2 * time.Second)
			if checkHealth(s.Config.Port) {
				l.Info("system health check passed", zap.String("status", "healthy"))
			} else {
				l.Warn("system health check failed", zap.String("status", "unhealthy"))
			}
		}()

		if err := s.Start(); err != nil {
			l.Fatal("server failed to start", zap.Error(err))
		}
	})
}

func printBanner(port, dbPath, appURL string) {
	fmt.Println(`
                     ▒▓▓▓█████▓▓▒                     
                ▒▓███████████████████▓                
             ▒█████▒              ░█████▓             
          ░████░                      ░████▓          
        ▒███▒                            ▒███▓        
      ░▓██░                                ░███▓      
     ▒██▒                                    ▒██▓     
    ▓██░                                      ░███    
   ▓██                                          ███   
  ▓██             ░░░                            ███  
 ▒▓█▒          ▓███████▓                         ▒███ 
 ▒██         ▒██▒     ░██▒                        ███ 
 ▓█▒        ██▓   ▓█▓   ██▒                       ▒███
 ██░       ██▓  ▒█████   ██▒                      ░███
 ███████████   ▒███████   ██░           ▓████████████▓
 ██▓░░░░░     ██████████   ██░        ███▓░░░░░░░░▓██▓
  ▓█▒       ▒█████████████   ██▒     ░██▒          ▒███
  ▒█▓  ▒███████████████████   ███░ ▒███   ▓█████▒  ▓██ 
  ▒██░  ████████████████████░   ████▓   ░███████  ░███ 
   ▓██   █████████████████████        ░████████   ███  
    ███   ████████████████████████████████████   ███   
     ███   ▓████████████████████████████████▓   ███    
      ▓██▒  ░██████████████████████████████░  ▒███     
       ▒███░  ░▓████████████████████████▓░   ███▓      
        ▒▓███░   ░████████████████████░   ░███▓▓       
          ▒▒███▓      ▒██████████▒      ▓███▓          
              ▓████▓                ▓████▓▒            
                ░▒████████████████████▓▒               
                      ▒▓▓▓█████▓▓▓░                                       
                                                        
   GoStreamix Engine
   --------------------------------------------------`)

	fmt.Printf("  App URL   : %s\n", appURL)
	fmt.Printf("  Port      : %s\n", port)
	fmt.Printf("  Datastore : %s\n", dbPath)
	fmt.Println("  --------------------------------------------------")
}

func checkHealth(port string) bool {
	url := fmt.Sprintf("http://127.0.0.1:%s/health", port)
	client := http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == 200
}
