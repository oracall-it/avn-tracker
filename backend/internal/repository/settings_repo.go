package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type SettingsRepo struct {
	pool *pgxpool.Pool
}

func NewSettingsRepo(pool *pgxpool.Pool) *SettingsRepo {
	return &SettingsRepo{pool: pool}
}

func (r *SettingsRepo) Get(ctx context.Context, key string) (string, error) {
	var value string
	err := r.pool.QueryRow(ctx, `SELECT value FROM settings WHERE key = $1`, key).Scan(&value)
	if err != nil {
		return "", nil // missing key returns empty string, not error
	}
	return value, nil
}

func (r *SettingsRepo) Set(ctx context.Context, key, value string) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO settings (key, value) VALUES ($1, $2)
		 ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
		key, value,
	)
	return err
}

func (r *SettingsRepo) GetF95Credentials(ctx context.Context) (username, password string, err error) {
	username, err = r.Get(ctx, "f95_username")
	if err != nil {
		return
	}
	password, err = r.Get(ctx, "f95_password")
	return
}
