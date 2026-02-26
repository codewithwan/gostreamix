package notification

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/uptrace/bun"
)

type repository struct {
	db *bun.DB
}

func NewRepository(db *bun.DB) Repository {
	return &repository{db: db}
}

func (r *repository) Get(ctx context.Context) (*Settings, error) {
	var s Settings
	err := r.db.NewSelect().Model(&s).Order("id ASC").Limit(1).Scan(ctx)
	if err == nil {
		return &s, nil
	}
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return nil, fmt.Errorf("query notification settings: %w", err)
}

func (r *repository) Create(ctx context.Context, s *Settings) error {
	if _, err := r.db.NewInsert().Model(s).Exec(ctx); err != nil {
		return fmt.Errorf("insert notification settings: %w", err)
	}
	return nil
}

func (r *repository) Update(ctx context.Context, s *Settings) error {
	if _, err := r.db.NewUpdate().Model(s).WherePK().Exec(ctx); err != nil {
		return fmt.Errorf("update notification settings: %w", err)
	}
	return nil
}
