package syncer

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"avn-tracker/backend/internal/f95"
	"avn-tracker/backend/internal/model"
)

type gameRepo interface {
	ListWithF95ID(ctx context.Context) ([]*model.Game, error)
	UpdateLatestVersion(ctx context.Context, id, latestVersion string) (*model.Game, error)
}

// f95Scraper is the subset of f95.Client used by Syncer.
type f95Scraper interface {
	IsLoggedIn() bool
	InvalidateCache(url string)
	GetGame(ctx context.Context, url string) (*f95.Game, error)
}

type Result struct {
	Total   int
	Updated int
	Errors  []string
}

type Syncer struct {
	repo gameRepo
	f95  f95Scraper

	mu      sync.Mutex
	running bool
}

func New(repo gameRepo, f95Client f95Scraper) *Syncer {
	return &Syncer{repo: repo, f95: f95Client}
}

// SyncAll checks all library games with F95 IDs for version updates.
// Returns immediately if a sync is already in progress.
func (s *Syncer) SyncAll(ctx context.Context) Result {
	s.mu.Lock()
	if s.running {
		s.mu.Unlock()
		return Result{Errors: []string{"sync already in progress"}}
	}
	s.running = true
	s.mu.Unlock()

	defer func() {
		s.mu.Lock()
		s.running = false
		s.mu.Unlock()
	}()

	if !s.f95.IsLoggedIn() {
		return Result{Errors: []string{"not logged in to F95Zone"}}
	}

	games, err := s.repo.ListWithF95ID(ctx)
	if err != nil {
		return Result{Errors: []string{fmt.Sprintf("list games: %v", err)}}
	}

	result := Result{Total: len(games)}
	log.Printf("[Sync] Starting F95 version sweep: %d games", len(games))

	for i, game := range games {
		if !s.f95.IsLoggedIn() {
			result.Errors = append(result.Errors, "lost F95Zone session mid-sync")
			break
		}

		threadURL := fmt.Sprintf("https://f95zone.to/threads/%s/", *game.F95Id)
		s.f95.InvalidateCache(threadURL)

		log.Printf("[Sync] [%d/%d] Checking %s", i+1, len(games), game.Title)

		f95Game, err := s.f95.GetGame(ctx, threadURL)
		if err != nil {
			log.Printf("[Sync] [%d/%d] %s: scrape error: %v", i+1, len(games), game.Title, err)
			result.Errors = append(result.Errors, fmt.Sprintf("%s: %v", game.Title, err))
		}
		if err == nil && f95Game.Version != "" && f95Game.Version != game.LatestVersion {
			if _, err := s.repo.UpdateLatestVersion(ctx, game.ID, f95Game.Version); err != nil {
				result.Errors = append(result.Errors, fmt.Sprintf("%s update: %v", game.Title, err))
			} else {
				log.Printf("[Sync] [%d/%d] %s: %q → %q", i+1, len(games), game.Title, game.LatestVersion, f95Game.Version)
				result.Updated++
			}
		}

		if i < len(games)-1 {
			select {
			case <-ctx.Done():
				return result
			case <-time.After(2 * time.Second):
			}
		}
	}

	log.Printf("[Sync] F95 sweep done: %d/%d updated, %d errors", result.Updated, result.Total, len(result.Errors))
	return result
}

// IsRunning reports whether a sync is currently in progress.
func (s *Syncer) IsRunning() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.running
}
