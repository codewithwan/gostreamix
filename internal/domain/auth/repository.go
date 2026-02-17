package auth

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

func (r *repository) CountUsers(ctx context.Context) (int, error) {
	return r.db.NewSelect().Model((*User)(nil)).Count(ctx)
}

func (r *repository) CreateUser(ctx context.Context, u *User) error {
	_, err := r.db.NewInsert().Model(u).Exec(ctx)
	return err
}

func (r *repository) GetUserByUsername(ctx context.Context, u string) (*User, error) {
	usr := new(User)
	err := r.db.NewSelect().Model(usr).Where("username = ?", u).Scan(ctx)
	return usr, err
}

func (r *repository) GetUserByID(ctx context.Context, id uuid.UUID) (*User, error) {
	usr := new(User)
	err := r.db.NewSelect().Model(usr).Where("id = ?", id).Scan(ctx)
	return usr, err
}

func (r *repository) UpdatePassword(ctx context.Context, username, hash string) error {
	_, err := r.db.NewUpdate().Model((*User)(nil)).Set("password_hash = ?", hash).Where("username = ?", username).Exec(ctx)
	return err
}

func (r *repository) GetAnyUser(ctx context.Context) (*User, error) {
	usr := new(User)
	err := r.db.NewSelect().Model(usr).Limit(1).Scan(ctx)
	return usr, err
}

func (r *repository) SaveRefreshToken(ctx context.Context, rt *RefreshToken) error {
	_, err := r.db.NewInsert().Model(rt).Exec(ctx)
	return err
}

func (r *repository) GetRefreshToken(ctx context.Context, hash string) (*RefreshToken, error) {
	rt := new(RefreshToken)
	err := r.db.NewSelect().Model(rt).Where("token_hash = ?", hash).Scan(ctx)
	return rt, err
}

func (r *repository) RevokeRefreshToken(ctx context.Context, hash string) error {
	_, err := r.db.NewDelete().Model((*RefreshToken)(nil)).Where("token_hash = ?", hash).Exec(ctx)
	return err
}

func (r *repository) RevokeAllRefreshTokens(ctx context.Context, userID uuid.UUID) error {
	_, err := r.db.NewDelete().Model((*RefreshToken)(nil)).Where("user_id = ?", userID).Exec(ctx)
	return err
}
