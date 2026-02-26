package activity

import (
	"sync"
	"time"
)

const maxEntries = 500

type Entry struct {
	Timestamp  time.Time `json:"timestamp"`
	Source     string    `json:"source"`
	Level      string    `json:"level"`
	Event      string    `json:"event"`
	Message    string    `json:"message"`
	StreamID   string    `json:"stream_id,omitempty"`
	Method     string    `json:"method"`
	Path       string    `json:"path"`
	Status     int       `json:"status"`
	LatencyMS  int64     `json:"latency_ms"`
	IP         string    `json:"ip"`
	UserAgent  string    `json:"user_agent"`
	IsAPI      bool      `json:"is_api"`
	RequestID  string    `json:"request_id"`
	StatusText string    `json:"status_text"`
}

type PageResult[T any] struct {
	Items      []T `json:"items"`
	Page       int `json:"page"`
	PerPage    int `json:"per_page"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

var store = struct {
	mu      sync.RWMutex
	entries []Entry
}{
	entries: make([]Entry, 0, maxEntries),
}

func Record(entry Entry) {
	store.mu.Lock()
	defer store.mu.Unlock()

	store.entries = append(store.entries, entry)
	if len(store.entries) > maxEntries {
		excess := len(store.entries) - maxEntries
		store.entries = append([]Entry(nil), store.entries[excess:]...)
	}
}

func List(limit int) []Entry {
	if limit <= 0 {
		limit = 100
	}
	if limit > maxEntries {
		limit = maxEntries
	}

	store.mu.RLock()
	defer store.mu.RUnlock()

	if len(store.entries) == 0 {
		return []Entry{}
	}

	start := 0
	if len(store.entries) > limit {
		start = len(store.entries) - limit
	}

	slice := append([]Entry(nil), store.entries[start:]...)
	for i, j := 0, len(slice)-1; i < j; i, j = i+1, j-1 {
		slice[i], slice[j] = slice[j], slice[i]
	}

	return slice
}

func ListPage(page, perPage int) PageResult[Entry] {
	store.mu.RLock()
	defer store.mu.RUnlock()

	source := append([]Entry(nil), store.entries...)
	for i, j := 0, len(source)-1; i < j; i, j = i+1, j-1 {
		source[i], source[j] = source[j], source[i]
	}

	return paginate(source, page, perPage)
}

func paginate[T any](source []T, page, perPage int) PageResult[T] {
	if perPage <= 0 {
		perPage = 30
	}
	if perPage > maxEntries {
		perPage = maxEntries
	}
	if page <= 0 {
		page = 1
	}

	total := len(source)
	totalPages := 0
	if total > 0 {
		totalPages = (total + perPage - 1) / perPage
	} else {
		page = 1
	}

	if totalPages > 0 && page > totalPages {
		page = totalPages
	}

	start := (page - 1) * perPage
	if total == 0 || start < 0 || start >= total {
		return PageResult[T]{
			Items:      []T{},
			Page:       page,
			PerPage:    perPage,
			Total:      total,
			TotalPages: totalPages,
		}
	}

	end := start + perPage
	if end > total {
		end = total
	}

	items := append([]T(nil), source[start:end]...)

	return PageResult[T]{
		Items:      items,
		Page:       page,
		PerPage:    perPage,
		Total:      total,
		TotalPages: totalPages,
	}
}
