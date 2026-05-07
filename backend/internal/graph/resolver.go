package graph

import (
	"avn-tracker/backend/internal/repository"
	"avn-tracker/backend/internal/vndb"
)

type Resolver struct {
	Repo *repository.GameRepo
	VNDB *vndb.Client
}
