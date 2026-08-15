package syncer

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"testing"

	"avn-tracker/backend/internal/f95"
	"avn-tracker/backend/internal/model"
)

// ─── fakes ───────────────────────────────────────────────────────────────────

type fakeRepo struct {
	games     []*model.Game
	listErr   error
	updateErr error
	updated   map[string]string // id → new version
}

func (r *fakeRepo) ListWithF95ID(_ context.Context) ([]*model.Game, error) {
	return r.games, r.listErr
}

func (r *fakeRepo) UpdateLatestVersion(_ context.Context, id, v string) (*model.Game, error) {
	if r.updateErr != nil {
		return nil, r.updateErr
	}
	if r.updated == nil {
		r.updated = make(map[string]string)
	}
	r.updated[id] = v
	return &model.Game{ID: id, LatestVersion: v}, nil
}

type fakeF95 struct {
	loggedIn bool
	games    map[string]*f95.Game // threadURL → Game
	getErr   error
}

func (f *fakeF95) IsLoggedIn() bool { return f.loggedIn }
func (f *fakeF95) InvalidateCache(_ string) {}
func (f *fakeF95) GetGame(_ context.Context, url string) (*f95.Game, error) {
	if f.getErr != nil {
		return nil, f.getErr
	}
	g, ok := f.games[url]
	if !ok {
		return nil, fmt.Errorf("not found: %s", url)
	}
	return g, nil
}

func f95ID(id string) *string { s := id; return &s }

func gameWithF95ID(id, title, latestVersion, f95id string) *model.Game {
	return &model.Game{
		ID:            id,
		Title:         title,
		LatestVersion: latestVersion,
		F95Id:         f95ID(f95id),
	}
}

// ─── tests ───────────────────────────────────────────────────────────────────

func TestSyncAll_NotLoggedIn(t *testing.T) {
	s := New(&fakeRepo{}, &fakeF95{loggedIn: false})
	r := s.SyncAll(context.Background())

	if r.Updated != 0 {
		t.Errorf("expected Updated=0; got %d", r.Updated)
	}
	if len(r.Errors) == 0 || !strings.Contains(r.Errors[0], "not logged in") {
		t.Errorf("expected not-logged-in error; got %v", r.Errors)
	}
}

func TestSyncAll_NoGames(t *testing.T) {
	s := New(&fakeRepo{games: []*model.Game{}}, &fakeF95{loggedIn: true})
	r := s.SyncAll(context.Background())

	if r.Total != 0 || r.Updated != 0 || len(r.Errors) != 0 {
		t.Errorf("expected empty result; got %+v", r)
	}
}

func TestSyncAll_ListError(t *testing.T) {
	repo := &fakeRepo{listErr: errors.New("db down")}
	s := New(repo, &fakeF95{loggedIn: true})
	r := s.SyncAll(context.Background())

	if len(r.Errors) == 0 || !strings.Contains(r.Errors[0], "db down") {
		t.Errorf("expected list error; got %v", r.Errors)
	}
}

func TestSyncAll_VersionUnchanged(t *testing.T) {
	game := gameWithF95ID("g1", "My Game", "v1.0", "12345")
	repo := &fakeRepo{games: []*model.Game{game}}
	scraper := &fakeF95{
		loggedIn: true,
		games: map[string]*f95.Game{
			"https://f95zone.to/threads/12345/": {Version: "v1.0"},
		},
	}
	s := New(repo, scraper)
	r := s.SyncAll(context.Background())

	if r.Total != 1 {
		t.Errorf("expected Total=1; got %d", r.Total)
	}
	if r.Updated != 0 {
		t.Errorf("expected Updated=0 (version unchanged); got %d", r.Updated)
	}
	if len(r.Errors) != 0 {
		t.Errorf("unexpected errors: %v", r.Errors)
	}
}

func TestSyncAll_VersionUpdated(t *testing.T) {
	game := gameWithF95ID("g1", "My Game", "v1.0", "12345")
	repo := &fakeRepo{games: []*model.Game{game}}
	scraper := &fakeF95{
		loggedIn: true,
		games: map[string]*f95.Game{
			"https://f95zone.to/threads/12345/": {Version: "v2.0"},
		},
	}
	s := New(repo, scraper)
	r := s.SyncAll(context.Background())

	if r.Updated != 1 {
		t.Errorf("expected Updated=1; got %d", r.Updated)
	}
	if len(r.Errors) != 0 {
		t.Errorf("unexpected errors: %v", r.Errors)
	}
	if repo.updated["g1"] != "v2.0" {
		t.Errorf("expected repo to record v2.0; got %q", repo.updated["g1"])
	}
}

func TestSyncAll_EmptyVersionSkipped(t *testing.T) {
	// f95 returned empty version (parse failure) — should not update
	game := gameWithF95ID("g1", "My Game", "v1.0", "12345")
	repo := &fakeRepo{games: []*model.Game{game}}
	scraper := &fakeF95{
		loggedIn: true,
		games: map[string]*f95.Game{
			"https://f95zone.to/threads/12345/": {Version: ""},
		},
	}
	s := New(repo, scraper)
	r := s.SyncAll(context.Background())

	if r.Updated != 0 {
		t.Errorf("empty version should not trigger update; got Updated=%d", r.Updated)
	}
}

func TestSyncAll_ScrapeError_RecordedAndContinues(t *testing.T) {
	ok := gameWithF95ID("g1", "Good Game", "v1.0", "11111")
	bad := gameWithF95ID("g2", "Bad Game", "v1.0", "99999") // no entry in scraper map
	repo := &fakeRepo{games: []*model.Game{ok, bad}}
	scraper := &fakeF95{
		loggedIn: true,
		games: map[string]*f95.Game{
			"https://f95zone.to/threads/11111/": {Version: "v2.0"},
			// 99999 missing → GetGame returns error
		},
	}
	s := New(repo, scraper)
	r := s.SyncAll(context.Background())

	if r.Total != 2 {
		t.Errorf("expected Total=2; got %d", r.Total)
	}
	if r.Updated != 1 {
		t.Errorf("expected Updated=1 (ok game updated); got %d", r.Updated)
	}
	if len(r.Errors) != 1 {
		t.Errorf("expected 1 error for bad game; got %d: %v", len(r.Errors), r.Errors)
	}
}

func TestSyncAll_UpdateError_RecordedAndContinues(t *testing.T) {
	game := gameWithF95ID("g1", "My Game", "v1.0", "12345")
	repo := &fakeRepo{
		games:     []*model.Game{game},
		updateErr: errors.New("constraint violation"),
	}
	scraper := &fakeF95{
		loggedIn: true,
		games: map[string]*f95.Game{
			"https://f95zone.to/threads/12345/": {Version: "v2.0"},
		},
	}
	s := New(repo, scraper)
	r := s.SyncAll(context.Background())

	if r.Updated != 0 {
		t.Errorf("expected Updated=0 on update error; got %d", r.Updated)
	}
	if len(r.Errors) == 0 || !strings.Contains(r.Errors[0], "constraint violation") {
		t.Errorf("expected update error in result; got %v", r.Errors)
	}
}

func TestSyncAll_AlreadyRunning_ReturnsImmediately(t *testing.T) {
	// Manually set running=true to simulate concurrent sync.
	s := New(&fakeRepo{games: []*model.Game{}}, &fakeF95{loggedIn: true})
	s.mu.Lock()
	s.running = true
	s.mu.Unlock()

	r := s.SyncAll(context.Background())

	if len(r.Errors) == 0 || !strings.Contains(r.Errors[0], "already in progress") {
		t.Errorf("expected already-in-progress error; got %v", r.Errors)
	}
}

func TestSyncAll_ConcurrentCalls_OnlyOneRuns(t *testing.T) {
	// Use a blocking fake so the first goroutine holds the lock while the second starts.
	game := gameWithF95ID("g1", "My Game", "v1.0", "12345")

	entered := make(chan struct{})  // signals first goroutine entered ListWithF95ID
	release := make(chan struct{})  // unblocks first goroutine

	blockingRepo := &blockingFakeRepo{
		game:    game,
		entered: entered,
		release: release,
	}
	scraper := &fakeF95{loggedIn: true, games: map[string]*f95.Game{}}
	s := New(blockingRepo, scraper)

	var wg sync.WaitGroup
	results := make([]Result, 2)

	// First goroutine: will block inside ListWithF95ID.
	wg.Add(1)
	go func() {
		defer wg.Done()
		results[0] = s.SyncAll(context.Background())
	}()

	// Wait until goroutine 1 is inside SyncAll and holds running=true.
	<-entered

	// Call synchronously — goroutine 1 holds the lock so this returns immediately.
	results[1] = s.SyncAll(context.Background())

	// Unblock goroutine 1 and wait for it to finish.
	close(release)
	wg.Wait()

	alreadyInProgress := 0
	for _, r := range results {
		for _, e := range r.Errors {
			if strings.Contains(e, "already in progress") {
				alreadyInProgress++
			}
		}
	}
	if alreadyInProgress != 1 {
		t.Errorf("expected exactly one call to get already-in-progress; got %d", alreadyInProgress)
	}
}

// blockingFakeRepo blocks in ListWithF95ID until released, to simulate long-running sync.
type blockingFakeRepo struct {
	game    *model.Game
	entered chan struct{}
	release chan struct{}
	once    sync.Once
}

func (r *blockingFakeRepo) ListWithF95ID(_ context.Context) ([]*model.Game, error) {
	r.once.Do(func() { close(r.entered) })
	<-r.release
	return []*model.Game{r.game}, nil
}

func (r *blockingFakeRepo) UpdateLatestVersion(_ context.Context, id, v string) (*model.Game, error) {
	return &model.Game{ID: id, LatestVersion: v}, nil
}

func TestSyncAll_ContextCancelled_StopsMidLoop(t *testing.T) {
	games := []*model.Game{
		gameWithF95ID("g1", "Game 1", "v1.0", "11111"),
		gameWithF95ID("g2", "Game 2", "v1.0", "22222"),
	}
	repo := &fakeRepo{games: games}
	scraper := &fakeF95{
		loggedIn: true,
		games: map[string]*f95.Game{
			"https://f95zone.to/threads/11111/": {Version: "v2.0"},
			"https://f95zone.to/threads/22222/": {Version: "v2.0"},
		},
	}
	s := New(repo, scraper)

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // cancelled immediately

	r := s.SyncAll(ctx)

	// Should have processed the first game (no rate-limit wait before it),
	// then stopped before the second because context is cancelled.
	if r.Total != 2 {
		t.Errorf("expected Total=2; got %d", r.Total)
	}
	// Updated may be 0 or 1 depending on timing, but must not be 2.
	if r.Updated > 1 {
		t.Errorf("expected at most 1 update with cancelled ctx; got %d", r.Updated)
	}
}
