package graph

import (
	"avn-tracker/backend/internal/f95"
	"avn-tracker/backend/internal/repository"
	"avn-tracker/backend/internal/vndb"
)

type Resolver struct {
	Repo     *repository.GameRepo
	Settings *repository.SettingsRepo
	VNDB     *vndb.Client
	F95      *f95.Client
}
