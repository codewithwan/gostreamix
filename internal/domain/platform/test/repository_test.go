package test

import (
	"context"
	"database/sql"
	"testing"

	"github.com/codewithwan/gostreamix/internal/domain/platform"
	_ "github.com/glebarez/go-sqlite"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/sqlitedialect"
)

func setupTestDB(t *testing.T) *bun.DB {
	sqldb, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatal(err)
	}
	db := bun.NewDB(sqldb, sqlitedialect.New())

	ctx := context.Background()
	_, err = db.NewCreateTable().Model((*platform.Platform)(nil)).Exec(ctx)
	if err != nil {
		t.Fatal(err)
	}

	return db
}

func TestPlatformRepository(t *testing.T) {
	db := setupTestDB(t)
	repo := platform.NewRepository(db)
	ctx := context.Background()
	userID := uuid.New()

	t.Run("Create and FindByID", func(t *testing.T) {
		p := &platform.Platform{
			ID:           uuid.New(),
			UserID:       userID,
			Name:         "Twitch Test",
			PlatformType: "twitch",
			StreamKey:    "test_key",
		}

		err := repo.Create(ctx, p)
		assert.NoError(t, err)

		found, err := repo.FindByID(ctx, p.ID)
		assert.NoError(t, err)
		assert.Equal(t, p.Name, found.Name)
		assert.Equal(t, p.UserID, found.UserID)
	})

	t.Run("FindByUserID", func(t *testing.T) {
		p1 := &platform.Platform{ID: uuid.New(), UserID: userID, Name: "P1", PlatformType: "t", StreamKey: "k"}
		p2 := &platform.Platform{ID: uuid.New(), UserID: userID, Name: "P2", PlatformType: "t", StreamKey: "k"}
		_ = repo.Create(ctx, p1)
		_ = repo.Create(ctx, p2)

		platforms, err := repo.FindByUserID(ctx, userID)
		assert.NoError(t, err)
		assert.GreaterOrEqual(t, len(platforms), 2)
	})

	t.Run("Update", func(t *testing.T) {
		id := uuid.New()
		p := &platform.Platform{ID: id, UserID: userID, Name: "Old", PlatformType: "t", StreamKey: "k"}
		_ = repo.Create(ctx, p)

		p.Name = "New"
		err := repo.Update(ctx, p)
		assert.NoError(t, err)

		found, _ := repo.FindByID(ctx, id)
		assert.Equal(t, "New", found.Name)
	})

	t.Run("Delete", func(t *testing.T) {
		id := uuid.New()
		p := &platform.Platform{ID: id, UserID: userID, Name: "To Delete", PlatformType: "t", StreamKey: "k"}
		_ = repo.Create(ctx, p)

		err := repo.Delete(ctx, id)
		assert.NoError(t, err)

		found, err := repo.FindByID(ctx, id)
		assert.Error(t, err)
		assert.Nil(t, found)
	})
}
