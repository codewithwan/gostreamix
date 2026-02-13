package stream

import (
	"os/exec"
	"sync"
	"time"

	"github.com/google/uuid"
)

type ProcessManager struct {
	processes map[uuid.UUID]*Process
	mu        sync.RWMutex
}

func NewProcessManager() *ProcessManager {
	return &ProcessManager{
		processes: make(map[uuid.UUID]*Process),
	}
}

func (m *ProcessManager) Register(id uuid.UUID, cmd *exec.Cmd) *Process {
	m.mu.Lock()
	defer m.mu.Unlock()

	p := &Process{
		ID:        id,
		Cmd:       cmd,
		Status:    StatusStarting,
		StartedAt: time.Now(),
	}
	m.processes[id] = p
	return p
}

func (m *ProcessManager) Unregister(id uuid.UUID) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.processes, id)
}

func (m *ProcessManager) Get(id uuid.UUID) (*Process, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	p, ok := m.processes[id]
	return p, ok
}
