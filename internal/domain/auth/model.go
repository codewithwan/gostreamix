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

type RefreshToken struct {
	bun.BaseModel `bun:"table:refresh_tokens,alias:rt"`

	ID        uuid.UUID `bun:",pk,type:text" json:"id"`
	UserID    uuid.UUID `bun:",notnull,type:text" json:"user_id"`
	User      *User     `bun:"rel:belongs-to,join:user_id=id"`
	TokenHash string    `bun:",notnull,unique" json:"-"`
	ExpiresAt time.Time `bun:",notnull" json:"expires_at"`
	Revoked   bool      `bun:",notnull,default:false" json:"revoked"`
	IPAddress string    `bun:",type:text" json:"ip_address"`
	UserAgent string    `bun:",type:text" json:"user_agent"`
	CreatedAt time.Time `bun:",nullzero,notnull,default:current_timestamp" json:"created_at"`
}
