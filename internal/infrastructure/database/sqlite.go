package database

import (
	"context"
	"database/sql"
	"os"
	"path/filepath"
	"reflect"

	"github.com/codewithwan/gostreamix/internal/domain/auth"
	"github.com/codewithwan/gostreamix/internal/domain/platform"
	"github.com/codewithwan/gostreamix/internal/domain/stream"
	"github.com/codewithwan/gostreamix/internal/domain/video"
	"github.com/codewithwan/gostreamix/internal/infrastructure/config"
	_ "github.com/glebarez/go-sqlite"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
	"go.uber.org/zap"
)

func NewSQLiteDB(cfg *config.Config, log *zap.Logger) (*bun.DB, error) {
	if err := os.MkdirAll(filepath.Dir(cfg.DBPath), 0755); err != nil {
		return nil, err
	}
	sqldb, err := sql.Open("sqlite", cfg.DBPath+"?_journal=WAL&_synchronous=NORMAL")
	if err != nil {
		return nil, err
	}
	db := bun.NewDB(sqldb, sqlitedialect.New())
	log.Info("database connected", zap.String("path", cfg.DBPath))

	if err := migrate(ctx(), db, log); err != nil {
		return nil, err
	}
	return db, nil
}

func migrate(ctx context.Context, db *bun.DB, log *zap.Logger) error {
	models := []interface{}{
		(*auth.User)(nil),
		(*stream.Stream)(nil),
		(*video.Video)(nil),
		(*platform.Platform)(nil),
	}

	for _, m := range models {
		if _, err := db.NewCreateTable().Model(m).IfNotExists().Exec(ctx); err != nil {
			return err
		}

		name := reflect.TypeOf(m).Elem().Name()
		log.Info("table verified", zap.String("table", name))
	}
	return nil
}

func ctx() context.Context {
	return context.Background()
}
