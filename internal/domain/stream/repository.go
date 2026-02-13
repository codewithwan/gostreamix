package stream

import (
	"context"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type repository struct {
	db *bun.DB
}

func NewRepository(db *bun.DB) Repository {
	return &repository{db: db}
}

func (r *repository) Create(ctx context.Context, s *Stream) error {
	_, err := r.db.NewInsert().Model(s).Exec(ctx)
	return err
}

func (r *repository) GetByID(ctx context.Context, id uuid.UUID) (*Stream, error) {
	s := new(Stream)
	err := r.db.NewSelect().Model(s).Where("id = ?", id).Scan(ctx)
	return s, err
}

func (r *repository) List(ctx context.Context) ([]*Stream, error) {
	var streams []*Stream
	err := r.db.NewSelect().Model(&streams).Scan(ctx)
	return streams, err
}

func (r *repository) Update(ctx context.Context, s *Stream) error {
	_, err := r.db.NewUpdate().Model(s).WherePK().Exec(ctx)
	return err
}

func (r *repository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.NewDelete().Model((*Stream)(nil)).Where("id = ?", id).Exec(ctx)
	return err
}
