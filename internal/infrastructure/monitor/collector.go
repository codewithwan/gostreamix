package monitor

import (
	"context"
	"fmt"
	"time"

	"github.com/uptrace/bun"
	"go.uber.org/zap"
)

type Collector struct {
	db       *bun.DB
	log      *zap.Logger
	interval time.Duration
}

func NewCollector(db *bun.DB, log *zap.Logger) *Collector {
	return &Collector{db: db, log: log, interval: 10 * time.Second}
}

func (c *Collector) Start(ctx context.Context) {
	go c.run(ctx)
}

func (c *Collector) run(ctx context.Context) {
	c.collect(ctx)

	ticker := time.NewTicker(c.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			c.collect(ctx)
		}
	}
}

func (c *Collector) collect(ctx context.Context) {
	stats := GetStats()

	sample := &MetricSample{
		CPU:    stats.CPU,
		Memory: stats.Memory,
		Disk:   stats.Disk,
	}

	if _, err := c.db.NewInsert().Model(sample).Exec(ctx); err != nil {
		c.log.Warn("failed to persist metric sample", zap.Error(err))
		return
	}

	if err := c.pruneOldSamples(ctx, 720); err != nil {
		c.log.Warn("failed to prune metric sample history", zap.Error(err))
	}
}

func (c *Collector) pruneOldSamples(ctx context.Context, keep int) error {
	if keep <= 0 {
		return nil
	}

	_, err := c.db.NewRaw(
		"DELETE FROM metric_samples WHERE id NOT IN (SELECT id FROM metric_samples ORDER BY recorded_at DESC LIMIT ?)",
		keep,
	).Exec(ctx)
	if err != nil {
		return fmt.Errorf("delete stale metric samples: %w", err)
	}
	return nil
}

func GetHistory(ctx context.Context, db *bun.DB, since time.Time, limit int) ([]MetricSample, error) {
	if limit <= 0 {
		limit = 360
	}

	samples := make([]MetricSample, 0, limit)
	query := db.NewSelect().Model(&samples).Order("recorded_at ASC").Limit(limit)
	if !since.IsZero() {
		query = query.Where("recorded_at >= ?", since)
	}

	if err := query.Scan(ctx); err != nil {
		return nil, fmt.Errorf("query metric history: %w", err)
	}

	return samples, nil
}
