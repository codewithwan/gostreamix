package stream

import (
	"context"

	"github.com/uptrace/bun"
)

type repository struct {
	db *bun.DB
}

func NewRepository(db *bun.DB) Repository {
	return &repository{db: db}
}

func (r *repository) Create(ctx context.Context, stream *Stream) error {
	_, err := r.db.NewInsert().Model(stream).Exec(ctx)
	return err
}

func (r *repository) GetByID(ctx context.Context, id int64) (*Stream, error) {
	s := new(Stream)
	err := r.db.NewSelect().Model(s).Where("id = ?", id).Scan(ctx)
	return s, err
}

func (r *repository) List(ctx context.Context) ([]*Stream, error) {
	var streams []*Stream
	err := r.db.NewSelect().Model(&streams).Scan(ctx)
	return streams, err
}

func (r *repository) Update(ctx context.Context, stream *Stream) error {
	_, err := r.db.NewUpdate().Model(stream).WherePK().Exec(ctx)
	return err
}

func (r *repository) Delete(ctx context.Context, id int64) error {
	_, err := r.db.NewDelete().Model((*Stream)(nil)).Where("id = ?", id).Exec(ctx)
	return err
}
