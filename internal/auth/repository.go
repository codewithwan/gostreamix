package auth

import (
	"context"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type Repository struct {
	db *bun.DB
}

func NewRepository(db *bun.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) CountUsers(ctx context.Context) (int, error) {
	return r.db.NewSelect().Model((*User)(nil)).Count(ctx)
}

func (r *Repository) CreateUser(ctx context.Context, u *User) error {
	_, err := r.db.NewInsert().Model(u).Exec(ctx)
	return err
}

func (r *Repository) GetUserByUsername(ctx context.Context, u string) (*User, error) {
	usr := new(User)
	err := r.db.NewSelect().Model(usr).Where("username = ?", u).Scan(ctx)
	return usr, err
}

func (r *Repository) GetUserByID(ctx context.Context, id uuid.UUID) (*User, error) {
	usr := new(User)
	err := r.db.NewSelect().Model(usr).Where("id = ?", id).Scan(ctx)
	return usr, err
}

func (r *Repository) UpdatePassword(ctx context.Context, username, hash string) error {
	_, err := r.db.NewUpdate().Model((*User)(nil)).Set("password_hash = ?", hash).Where("username = ?", username).Exec(ctx)
	return err
}

func (r *Repository) GetAnyUser(ctx context.Context) (*User, error) {
	usr := new(User)
	err := r.db.NewSelect().Model(usr).Limit(1).Scan(ctx)
	return usr, err
}
