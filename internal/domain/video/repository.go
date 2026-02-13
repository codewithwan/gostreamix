package video

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

func (r *repository) Create(ctx context.Context, v *Video) error {
	_, err := r.db.NewInsert().Model(v).Exec(ctx)
	return err
}

func (r *repository) GetByID(ctx context.Context, id uuid.UUID) (*Video, error) {
	v := new(Video)
	err := r.db.NewSelect().Model(v).Where("id = ?", id).Scan(ctx)
	return v, err
}

func (r *repository) List(ctx context.Context) ([]*Video, error) {
	var videos []*Video
	err := r.db.NewSelect().Model(&videos).Scan(ctx)
	return videos, err
}

func (r *repository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.NewDelete().Model((*Video)(nil)).Where("id = ?", id).Exec(ctx)
	return err
}
