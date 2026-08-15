package repository

import (
	"context"
	"time"

	"avn-tracker/backend/internal/model"

	"github.com/jackc/pgx/v5/pgxpool"
)

type LinkRepo struct {
	pool *pgxpool.Pool
}

func NewLinkRepo(pool *pgxpool.Pool) *LinkRepo {
	return &LinkRepo{pool: pool}
}

func (r *LinkRepo) List(ctx context.Context) ([]*model.RecommendationLink, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, url, title, added_at FROM recommendation_links ORDER BY added_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	links := make([]*model.RecommendationLink, 0)
	for rows.Next() {
		var l model.RecommendationLink
		var addedAt time.Time
		if err := rows.Scan(&l.ID, &l.URL, &l.Title, &addedAt); err != nil {
			return nil, err
		}
		l.AddedAt = addedAt.Format(time.RFC3339)
		links = append(links, &l)
	}
	return links, rows.Err()
}

func (r *LinkRepo) Create(ctx context.Context, url, title string) (*model.RecommendationLink, error) {
	var l model.RecommendationLink
	var addedAt time.Time
	err := r.pool.QueryRow(ctx,
		`INSERT INTO recommendation_links (url, title) VALUES ($1, $2)
		 RETURNING id, url, title, added_at`,
		url, title,
	).Scan(&l.ID, &l.URL, &l.Title, &addedAt)
	if err != nil {
		return nil, err
	}
	l.AddedAt = addedAt.Format(time.RFC3339)
	return &l, nil
}

func (r *LinkRepo) Update(ctx context.Context, id, title, url string) (*model.RecommendationLink, error) {
	var l model.RecommendationLink
	var addedAt time.Time
	err := r.pool.QueryRow(ctx,
		`UPDATE recommendation_links SET title = $1, url = $2 WHERE id = $3
		 RETURNING id, url, title, added_at`,
		title, url, id,
	).Scan(&l.ID, &l.URL, &l.Title, &addedAt)
	if err != nil {
		return nil, err
	}
	l.AddedAt = addedAt.Format(time.RFC3339)
	return &l, nil
}

func (r *LinkRepo) Delete(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM recommendation_links WHERE id = $1`, id)
	return err
}
