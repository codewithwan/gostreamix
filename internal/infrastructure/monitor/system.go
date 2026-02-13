package monitor

import (
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
)

func GetStats() *Stats {
	s := &Stats{}

	c, _ := cpu.Percent(time.Second, false)
	if len(c) > 0 {
		s.CPU = c[0]
	}

	m, _ := mem.VirtualMemory()
	if m != nil {
		s.Memory = m.UsedPercent
	}

	d, _ := disk.Usage("/")
	if d != nil {
		s.Disk = d.UsedPercent
	}

	return s
}
