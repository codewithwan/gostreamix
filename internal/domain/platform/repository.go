package platform

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

func (r *repository) Create(ctx context.Context, p *Platform) error {
	_, err := r.db.NewInsert().Model(p).Exec(ctx)
	return err
}

func (r *repository) Update(ctx context.Context, p *Platform) error {
	_, err := r.db.NewUpdate().Model(p).WherePK().Exec(ctx)
	return err
}

func (r *repository) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.NewDelete().Model((*Platform)(nil)).Where("id = ?", id).Exec(ctx)
	return err
}

func (r *repository) FindByID(ctx context.Context, id uuid.UUID) (*Platform, error) {
	p := new(Platform)
	err := r.db.NewSelect().Model(p).Where("id = ?", id).Scan(ctx)
	if err != nil {
		return nil, err
	}
	return p, nil
}

func (r *repository) FindByUserID(ctx context.Context, userID uuid.UUID) ([]*Platform, error) {
	var platforms []*Platform
	err := r.db.NewSelect().Model(&platforms).Where("user_id = ?", userID).Scan(ctx)
	return platforms, err
}
