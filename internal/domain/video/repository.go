package video

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

func (r *repository) Create(ctx context.Context, v *Video) error {
	_, err := r.db.NewInsert().Model(v).Exec(ctx)
	return err
}

func (r *repository) List(ctx context.Context) ([]*Video, error) {
	var videos []*Video
	err := r.db.NewSelect().Model(&videos).Scan(ctx)
	return videos, err
}

func (r *repository) Delete(ctx context.Context, id int64) error {
	_, err := r.db.NewDelete().Model((*Video)(nil)).Where("id = ?", id).Exec(ctx)
	return err
}
