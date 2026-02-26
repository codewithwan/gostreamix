package database

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"reflect"

	"github.com/codewithwan/gostreamix/internal/domain/auth"
	"github.com/codewithwan/gostreamix/internal/domain/notification"
	"github.com/codewithwan/gostreamix/internal/domain/platform"
	"github.com/codewithwan/gostreamix/internal/domain/stream"
	"github.com/codewithwan/gostreamix/internal/domain/video"
	"github.com/codewithwan/gostreamix/internal/infrastructure/config"
	"github.com/codewithwan/gostreamix/internal/infrastructure/monitor"
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
		(*auth.RefreshToken)(nil),
		(*stream.Stream)(nil),
		(*stream.StreamProgram)(nil),
		(*video.Video)(nil),
		(*platform.Platform)(nil),
		(*notification.Settings)(nil),
		(*monitor.MetricSample)(nil),
	}

	for _, m := range models {
		if _, err := db.NewCreateTable().Model(m).IfNotExists().Exec(ctx); err != nil {
			return err
		}

		name := reflect.TypeOf(m).Elem().Name()
		log.Info("table verified", zap.String("table", name))
	}

	if err := ensureColumnExists(ctx, db, "platforms", "color", "TEXT NOT NULL DEFAULT '#1f2937'"); err != nil {
		return err
	}
	if err := ensureColumnExists(ctx, db, "videos", "folder", "TEXT NOT NULL DEFAULT ''"); err != nil {
		return err
	}

	return nil
}

func ensureColumnExists(ctx context.Context, db *bun.DB, table, column, definition string) error {
	query := fmt.Sprintf("SELECT COUNT(*) FROM pragma_table_info('%s') WHERE name = '%s'", table, column)

	var count int
	if err := db.QueryRowContext(ctx, query).Scan(&count); err != nil {
		return fmt.Errorf("check column %s.%s: %w", table, column, err)
	}

	if count > 0 {
		return nil
	}

	alter := fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", table, column, definition)
	if _, err := db.ExecContext(ctx, alter); err != nil {
		return fmt.Errorf("add column %s.%s: %w", table, column, err)
	}

	return nil
}

func ctx() context.Context {
	return context.Background()
}
