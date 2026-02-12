package auth

import (
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type User struct {
	bun.BaseModel `bun:"table:users,alias:u"`

	ID           uuid.UUID `bun:",pk,type:text" json:"id"`
	Username     string    `bun:",unique,notnull" json:"username"`
	Email        string    `bun:",notnull" json:"email"`
	PasswordHash string    `bun:",notnull" json:"-"`
	CreatedAt    time.Time `bun:",nullzero,notnull,default:current_timestamp" json:"created_at"`
	UpdatedAt    time.Time `bun:",nullzero,notnull,default:current_timestamp" json:"updated_at"`
}
