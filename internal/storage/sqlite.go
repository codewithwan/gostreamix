package storage

import (
	"context"
	"database/sql"
	"os"
	"path/filepath"

	"github.com/codewithwan/gostreamix/internal/auth"
	"github.com/codewithwan/gostreamix/internal/config"
	"github.com/codewithwan/gostreamix/internal/stream"
	_ "github.com/glebarez/go-sqlite"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
)

func NewSQLiteDB(cfg *config.Config) (*bun.DB, error) {
	if err := os.MkdirAll(filepath.Dir(cfg.DBPath), 0755); err != nil {
		return nil, err
	}
	sqldb, err := sql.Open("sqlite", cfg.DBPath+"?_journal=WAL&_synchronous=NORMAL")
	if err != nil {
		return nil, err
	}
	db := bun.NewDB(sqldb, sqlitedialect.New())
	if err := migrate(ctx(), db); err != nil {
		return nil, err
	}
	return db, nil
}

func migrate(ctx context.Context, db *bun.DB) error {
	models := []interface{}{
		(*auth.User)(nil),
		(*stream.Stream)(nil),
		(*stream.Video)(nil),
	}
	for _, m := range models {
		if _, err := db.NewCreateTable().Model(m).IfNotExists().Exec(ctx); err != nil {
			return err
		}
	}
	return nil
}

func ctx() context.Context {
	return context.Background()
}
