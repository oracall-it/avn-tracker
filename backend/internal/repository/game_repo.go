package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"avn-tracker/backend/internal/model"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type GameRepo struct {
	pool *pgxpool.Pool
}

func NewGameRepo(pool *pgxpool.Pool) *GameRepo {
	return &GameRepo{pool: pool}
}

func (r *GameRepo) List(ctx context.Context, filter *model.GameFilter) ([]*model.Game, error) {
	q := `SELECT id, title, developer, cover_url, status, dev_status,
	             my_version, latest_version, download_url, tags, notes, description,
	             vndb_id, f95_id, added_at, updated_at
	      FROM games WHERE 1=1`
	args := []any{}
	i := 1

	if filter != nil {
		if filter.Status != nil {
			q += fmt.Sprintf(" AND status = $%d", i)
			args = append(args, string(*filter.Status))
			i++
		}
		if filter.Tag != nil {
			q += fmt.Sprintf(" AND $%d = ANY(tags)", i)
			args = append(args, *filter.Tag)
			i++
		}
		if filter.Search != nil {
			q += fmt.Sprintf(" AND (title ILIKE $%d OR developer ILIKE $%d)", i, i)
			args = append(args, "%"+*filter.Search+"%")
			i++
		}
	}

	q += " ORDER BY added_at DESC"

	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var games []*model.Game
	for rows.Next() {
		g, err := scanGame(rows)
		if err != nil {
			return nil, err
		}
		if filter != nil && filter.HasUpdate != nil {
			if g.HasUpdate != *filter.HasUpdate {
				continue
			}
		}
		games = append(games, g)
	}
	return games, rows.Err()
}

func (r *GameRepo) Get(ctx context.Context, id string) (*model.Game, error) {
	q := `SELECT id, title, developer, cover_url, status, dev_status,
	             my_version, latest_version, download_url, tags, notes, description,
	             vndb_id, f95_id, added_at, updated_at
	      FROM games WHERE id = $1`
	row := r.pool.QueryRow(ctx, q, id)
	return scanGame(row)
}

func (r *GameRepo) Create(ctx context.Context, in model.GameInput) (*model.Game, error) {
	status := model.GameStatusWant
	if in.Status != nil {
		status = *in.Status
	}
	devStatus := model.DevStatusOngoing
	if in.DevStatus != nil {
		devStatus = *in.DevStatus
	}
	tags := in.Tags
	if tags == nil {
		tags = []string{}
	}

	strOrEmpty := func(s *string) string {
		if s == nil {
			return ""
		}
		return *s
	}

	q := `INSERT INTO games (title, developer, cover_url, status, dev_status,
	                         my_version, latest_version, download_url, tags, notes, description, vndb_id, f95_id)
	      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
	      RETURNING id, title, developer, cover_url, status, dev_status,
	                my_version, latest_version, download_url, tags, notes, description,
	                vndb_id, f95_id, added_at, updated_at`

	row := r.pool.QueryRow(ctx, q,
		in.Title,
		strOrEmpty(in.Developer),
		strOrEmpty(in.CoverURL),
		string(status),
		string(devStatus),
		strOrEmpty(in.MyVersion),
		strOrEmpty(in.LatestVersion),
		strOrEmpty(in.DownloadURL),
		tags,
		strOrEmpty(in.Notes),
		strOrEmpty(in.Description),
		in.VndbID,
		in.F95Id,
	)
	return scanGame(row)
}

func (r *GameRepo) Update(ctx context.Context, id string, in model.GameInput) (*model.Game, error) {
	current, err := r.Get(ctx, id)
	if err != nil {
		return nil, err
	}

	apply := func(cur string, next *string) string {
		if next != nil {
			return *next
		}
		return cur
	}
	applyStatus := func(cur model.GameStatus, next *model.GameStatus) model.GameStatus {
		if next != nil {
			return *next
		}
		return cur
	}
	applyDevStatus := func(cur model.DevStatus, next *model.DevStatus) model.DevStatus {
		if next != nil {
			return *next
		}
		return cur
	}
	tags := current.Tags
	if in.Tags != nil {
		tags = in.Tags
	}

	q := `UPDATE games SET
	        title=$1, developer=$2, cover_url=$3, status=$4, dev_status=$5,
	        my_version=$6, latest_version=$7, download_url=$8, tags=$9, notes=$10,
	        description=$11, vndb_id=$12, f95_id=$13, updated_at=$14
	      WHERE id=$15
	      RETURNING id, title, developer, cover_url, status, dev_status,
	                my_version, latest_version, download_url, tags, notes, description,
	                vndb_id, f95_id, added_at, updated_at`

	row := r.pool.QueryRow(ctx, q,
		apply(current.Title, &in.Title),
		apply(current.Developer, in.Developer),
		apply(current.CoverURL, in.CoverURL),
		string(applyStatus(current.Status, in.Status)),
		string(applyDevStatus(current.DevStatus, in.DevStatus)),
		apply(current.MyVersion, in.MyVersion),
		apply(current.LatestVersion, in.LatestVersion),
		apply(current.DownloadURL, in.DownloadURL),
		tags,
		apply(current.Notes, in.Notes),
		apply(current.Description, in.Description),
		merge(current.VndbID, in.VndbID),
		merge(current.F95Id, in.F95Id),
		time.Now(),
		id,
	)
	return scanGame(row)
}

func (r *GameRepo) Delete(ctx context.Context, id string) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM games WHERE id = $1`, id)
	return err
}

func (r *GameRepo) ListWithF95ID(ctx context.Context) ([]*model.Game, error) {
	q := `SELECT id, title, developer, cover_url, status, dev_status,
	             my_version, latest_version, download_url, tags, notes, description,
	             vndb_id, f95_id, added_at, updated_at
	      FROM games WHERE f95_id IS NOT NULL AND f95_id != '' ORDER BY added_at DESC`
	rows, err := r.pool.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var games []*model.Game
	for rows.Next() {
		g, err := scanGame(rows)
		if err != nil {
			return nil, err
		}
		games = append(games, g)
	}
	return games, rows.Err()
}

func (r *GameRepo) UpdateLatestVersion(ctx context.Context, id, latestVersion string) (*model.Game, error) {
	q := `UPDATE games SET latest_version=$1, updated_at=$2 WHERE id=$3
	      RETURNING id, title, developer, cover_url, status, dev_status,
	                my_version, latest_version, download_url, tags, notes, description,
	                vndb_id, f95_id, added_at, updated_at`
	row := r.pool.QueryRow(ctx, q, latestVersion, time.Now(), id)
	return scanGame(row)
}

type ExportRow struct {
	ID            string    `json:"id"`
	Title         string    `json:"title"`
	Developer     string    `json:"developer"`
	CoverURL      string    `json:"coverUrl"`
	Status        string    `json:"status"`
	DevStatus     string    `json:"devStatus"`
	MyVersion     string    `json:"myVersion"`
	LatestVersion string    `json:"latestVersion"`
	DownloadURL   string    `json:"downloadUrl"`
	Tags          []string  `json:"tags"`
	Notes         string    `json:"notes"`
	Description   string    `json:"description"`
	VndbID        *string   `json:"vndbId,omitempty"`
	F95ID         *string   `json:"f95Id,omitempty"`
	AddedAt       time.Time `json:"addedAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

func (r *GameRepo) Export(ctx context.Context) (string, error) {
	games, err := r.List(ctx, nil)
	if err != nil {
		return "", err
	}
	rows := make([]ExportRow, len(games))
	for i, g := range games {
		rows[i] = ExportRow{
			ID: g.ID, Title: g.Title, Developer: g.Developer,
			CoverURL: g.CoverURL, Status: string(g.Status), DevStatus: string(g.DevStatus),
			MyVersion: g.MyVersion, LatestVersion: g.LatestVersion,
			DownloadURL: g.DownloadURL, Tags: g.Tags, Notes: g.Notes,
			Description: g.Description,
			VndbID: g.VndbID, F95ID: g.F95Id, AddedAt: g.AddedAt, UpdatedAt: g.UpdatedAt,
		}
	}
	b, err := json.Marshal(rows)
	return string(b), err
}

func (r *GameRepo) Import(ctx context.Context, jsonStr string) error {
	var rows []ExportRow
	if err := json.Unmarshal([]byte(jsonStr), &rows); err != nil {
		return err
	}
	for _, row := range rows {
		status := model.GameStatus(strings.ToUpper(row.Status))
		devStatus := model.DevStatus(strings.ToUpper(row.DevStatus))
		tags := row.Tags
		if tags == nil {
			tags = []string{}
		}
		_, err := r.pool.Exec(ctx, `
			INSERT INTO games (id, title, developer, cover_url, status, dev_status,
			                   my_version, latest_version, download_url, tags, notes, description,
			                   vndb_id, f95_id, added_at, updated_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
			ON CONFLICT (id) DO UPDATE SET
			  title=$2, developer=$3, cover_url=$4, status=$5, dev_status=$6,
			  my_version=$7, latest_version=$8, download_url=$9, tags=$10,
			  notes=$11, description=$12, vndb_id=$13, f95_id=$14, updated_at=$16`,
			row.ID, row.Title, row.Developer, row.CoverURL,
			string(status), string(devStatus),
			row.MyVersion, row.LatestVersion, row.DownloadURL,
			tags, row.Notes, row.Description, row.VndbID, row.F95ID, row.AddedAt, row.UpdatedAt,
		)
		if err != nil {
			return err
		}
	}
	return nil
}

type scanner interface {
	Scan(dest ...any) error
}

func scanGame(row scanner) (*model.Game, error) {
	var g model.Game
	var status, devStatus string
	err := row.Scan(
		&g.ID, &g.Title, &g.Developer, &g.CoverURL,
		&status, &devStatus,
		&g.MyVersion, &g.LatestVersion, &g.DownloadURL,
		&g.Tags, &g.Notes, &g.Description, &g.VndbID, &g.F95Id,
		&g.AddedAt, &g.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	g.Status = model.GameStatus(status)
	g.DevStatus = model.DevStatus(devStatus)
	g.HasUpdate = g.MyVersion != "" && g.MyVersion != g.LatestVersion
	if g.Tags == nil {
		g.Tags = []string{}
	}
	return &g, nil
}

func merge(cur *string, next *string) *string {
	if next != nil {
		return next
	}
	return cur
}
