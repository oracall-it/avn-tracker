package vndb

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// ─── extractVersion ───────────────────────────────────────────────────────────

func TestExtractVersion(t *testing.T) {
	cases := []struct {
		input string
		want  string
	}{
		{"Game Title v0.21.0 Public", "v0.21.0"},
		{"v1.2.3", "v1.2.3"},
		{"0.9.2", "0.9.2"},
		{"Chapter 5 Release 1.0b", "1.0b"},
		{"v2.0rc1", "v2.0rc1"},
		{"Version 3.1.4 Final", "3.1.4"},
		{"Public Release 0.7.5a", "0.7.5a"},
		{"v10.0.0", "v10.0.0"},
		// Falls back to full title when no version found
		{"No version here", "No version here"},
		{"", ""},
		{"Just a name", "Just a name"},
	}

	for _, c := range cases {
		t.Run(c.input, func(t *testing.T) {
			got := extractVersion(c.input)
			if got != c.want {
				t.Errorf("extractVersion(%q) = %q; want %q", c.input, got, c.want)
			}
		})
	}
}

// ─── cacheKey ─────────────────────────────────────────────────────────────────

func TestCacheKey_Deterministic(t *testing.T) {
	body := []byte(`{"query":"test","page":1}`)
	k1 := cacheKey(body)
	k2 := cacheKey(body)
	if k1 != k2 {
		t.Errorf("cacheKey is not deterministic: %q != %q", k1, k2)
	}
}

func TestCacheKey_UniquePerInput(t *testing.T) {
	k1 := cacheKey([]byte(`{"query":"abc"}`))
	k2 := cacheKey([]byte(`{"query":"xyz"}`))
	if k1 == k2 {
		t.Errorf("different inputs produced the same cache key: %q", k1)
	}
}

func TestCacheKey_NonEmpty(t *testing.T) {
	k := cacheKey([]byte(`{}`))
	if k == "" {
		t.Error("cacheKey returned empty string")
	}
}

// ─── Cache ────────────────────────────────────────────────────────────────────

func newTestClientLocal() *Client {
	return newTestClient("http://localhost:9999") // unreachable; used for cache tests only
}

func TestCache_SetAndGet(t *testing.T) {
	c := newTestClientLocal()
	key := "testkey"
	resp := SearchResponse{Count: 42, More: true}

	c.setCache(key, resp, time.Minute)

	got, ok := c.getCache(key)
	if !ok {
		t.Fatal("getCache returned false for a freshly set entry")
	}
	if got.Count != 42 || !got.More {
		t.Errorf("got %+v; want %+v", got, resp)
	}
}

func TestCache_Miss_NonExistent(t *testing.T) {
	c := newTestClientLocal()
	_, ok := c.getCache("nonexistent")
	if ok {
		t.Error("getCache returned true for a key that was never set")
	}
}

func TestCache_TTLExpiry(t *testing.T) {
	c := newTestClientLocal()
	key := "expiring"
	c.setCache(key, SearchResponse{Count: 1}, time.Millisecond)

	time.Sleep(5 * time.Millisecond)

	_, ok := c.getCache(key)
	if ok {
		t.Error("getCache returned true for an expired entry")
	}
}

func TestCache_GetStale_ReturnsExpired(t *testing.T) {
	c := newTestClientLocal()
	key := "stale"
	want := SearchResponse{Count: 7}
	c.setCache(key, want, time.Millisecond)

	time.Sleep(5 * time.Millisecond)

	got, ok := c.getStaleCache(key)
	if !ok {
		t.Fatal("getStaleCache returned false for an expired entry")
	}
	if got.Count != want.Count {
		t.Errorf("getStaleCache = %+v; want %+v", got, want)
	}
}

func TestCache_GetStale_Miss(t *testing.T) {
	c := newTestClientLocal()
	_, ok := c.getStaleCache("never-set")
	if ok {
		t.Error("getStaleCache returned true for a key that was never set")
	}
}

func TestCache_Eviction_ClearsExpiredOnSet(t *testing.T) {
	c := newTestClientLocal()

	// Insert three entries that expire immediately.
	for i := range 3 {
		c.setCache(string(rune('a'+i)), SearchResponse{Count: i}, time.Millisecond)
	}
	time.Sleep(5 * time.Millisecond)

	c.mu.RLock()
	countBefore := len(c.cache)
	c.mu.RUnlock()

	// Triggering a new set causes eviction of all expired entries.
	c.setCache("fresh", SearchResponse{Count: 99}, time.Minute)

	c.mu.RLock()
	countAfter := len(c.cache)
	c.mu.RUnlock()

	if countAfter >= countBefore {
		t.Errorf("expected eviction to reduce cache size; before=%d after=%d", countBefore, countAfter)
	}
	// Only the fresh entry should remain.
	if countAfter != 1 {
		t.Errorf("expected 1 entry after eviction; got %d", countAfter)
	}
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

// mockVNServer returns an httptest.Server that responds to /vn and /release
// with the provided VN and Release slices.
func mockVNServer(t *testing.T, vns []VN, count int, more bool) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/vn":
			_ = json.NewEncoder(w).Encode(SearchResponse{Results: vns, Count: count, More: more})
		default:
			http.NotFound(w, r)
		}
	}))
}

func mockReleaseServer(t *testing.T, releases []Release) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(struct {
			Results []Release `json:"results"`
		}{Results: releases})
	}))
}

// combinedMockServer serves both /vn and /release paths.
func combinedMockServer(t *testing.T, vns []VN, releases []Release, count int, more bool) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/vn":
			_ = json.NewEncoder(w).Encode(SearchResponse{Results: vns, Count: count, More: more})
		case "/release":
			_ = json.NewEncoder(w).Encode(struct {
				Results []Release `json:"results"`
			}{Results: releases})
		default:
			http.NotFound(w, r)
		}
	}))
}

var sampleVN = VN{
	ID:          "v123",
	Title:       "Test Visual Novel",
	Description: "A great VN for testing.",
	Image:       &vnImage{URL: "https://example.com/cover.jpg"},
	Developers:  []vnDev{{Name: "Test Studio"}},
	Tags:        []vnTag{{Name: "Romance"}, {Name: "Comedy"}},
	Screenshots: []vnScreenshot{
		{URL: "https://example.com/shot1.jpg", Thumbnail: "https://example.com/thumb1.jpg"},
	},
}

// ─── Search ───────────────────────────────────────────────────────────────────

func TestSearch_EmptyQuery_ReturnsPopular(t *testing.T) {
	srv := mockVNServer(t, []VN{sampleVN}, 1, false)
	defer srv.Close()

	c := newTestClient(srv.URL)
	resp, err := c.Search(context.Background(), "", 1, false)
	if err != nil {
		t.Fatalf("Search() error: %v", err)
	}
	if len(resp.Results) != 1 {
		t.Errorf("expected 1 result; got %d", len(resp.Results))
	}
	if resp.Results[0].ID != "v123" {
		t.Errorf("unexpected VN ID: %s", resp.Results[0].ID)
	}
}

func TestSearch_WithQuery(t *testing.T) {
	srv := mockVNServer(t, []VN{sampleVN}, 1, false)
	defer srv.Close()

	c := newTestClient(srv.URL)
	resp, err := c.Search(context.Background(), "test", 1, false)
	if err != nil {
		t.Fatalf("Search() error: %v", err)
	}
	if len(resp.Results) != 1 {
		t.Errorf("expected 1 result; got %d", len(resp.Results))
	}
}

func TestSearch_AdultsOnly(t *testing.T) {
	var capturedBody map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewDecoder(r.Body).Decode(&capturedBody)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(SearchResponse{Results: []VN{sampleVN}, Count: 1})
	}))
	defer srv.Close()

	c := newTestClient(srv.URL)
	_, err := c.Search(context.Background(), "", 1, true)
	if err != nil {
		t.Fatalf("Search() error: %v", err)
	}

	// Verify the adult tag filter was injected into the request body.
	filters, _ := capturedBody["filters"].([]any)
	if len(filters) == 0 {
		t.Error("expected filters to be set when adultsOnly=true")
	}
}

func TestSearch_Pagination(t *testing.T) {
	var capturedBody map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewDecoder(r.Body).Decode(&capturedBody)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(SearchResponse{Results: nil, Count: 100, More: true})
	}))
	defer srv.Close()

	c := newTestClient(srv.URL)
	resp, err := c.Search(context.Background(), "query", 3, false)
	if err != nil {
		t.Fatalf("Search() error: %v", err)
	}
	if !resp.More {
		t.Error("expected More=true from server")
	}
	if resp.Count != 100 {
		t.Errorf("expected Count=100; got %d", resp.Count)
	}

	pageVal, _ := capturedBody["page"].(float64)
	if int(pageVal) != 3 {
		t.Errorf("expected page=3 in request body; got %v", capturedBody["page"])
	}
}

func TestSearch_PageLessThanOne_ClampedToOne(t *testing.T) {
	var capturedBody map[string]any
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewDecoder(r.Body).Decode(&capturedBody)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(SearchResponse{})
	}))
	defer srv.Close()

	c := newTestClient(srv.URL)
	_, _ = c.Search(context.Background(), "", 0, false)

	pageVal, _ := capturedBody["page"].(float64)
	if int(pageVal) != 1 {
		t.Errorf("page 0 should be clamped to 1; got %v", capturedBody["page"])
	}
}

func TestSearch_CachesResult(t *testing.T) {
	callCount := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount++
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(SearchResponse{Results: []VN{sampleVN}, Count: 1})
	}))
	defer srv.Close()

	c := newTestClient(srv.URL)
	ctx := context.Background()

	_, _ = c.Search(ctx, "same", 1, false)
	_, _ = c.Search(ctx, "same", 1, false)

	if callCount != 1 {
		t.Errorf("expected 1 HTTP call (second should hit cache); got %d", callCount)
	}
}

func TestSearch_Returns429_NoCache_Error(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
	}))
	defer srv.Close()

	c := newTestClient(srv.URL)
	_, err := c.Search(context.Background(), "ratelimited", 1, false)
	if err == nil {
		t.Error("expected error on 429 with no cached entry; got nil")
	}
}

func TestSearch_Returns429_WithStaleCache_ReturnsCached(t *testing.T) {
	first := true
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if first {
			first = false
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(SearchResponse{Results: []VN{sampleVN}, Count: 1})
			return
		}
		w.WriteHeader(http.StatusTooManyRequests)
	}))
	defer srv.Close()

	c := newTestClient(srv.URL)
	ctx := context.Background()

	// Prime the cache.
	_, _ = c.Search(ctx, "cached", 1, false)

	// Manually expire the entry.
	c.mu.Lock()
	for k, e := range c.cache {
		e.expiresAt = time.Now().Add(-time.Hour)
		c.cache[k] = e
	}
	c.mu.Unlock()

	// Second call hits 429 — should get stale data back.
	resp, err := c.Search(ctx, "cached", 1, false)
	if err != nil {
		t.Fatalf("expected stale cache fallback, got error: %v", err)
	}
	if len(resp.Results) != 1 {
		t.Errorf("expected 1 stale result; got %d", len(resp.Results))
	}
}

// ─── GetVN ────────────────────────────────────────────────────────────────────

func TestGetVN_ReturnsVN(t *testing.T) {
	srv := mockVNServer(t, []VN{sampleVN}, 1, false)
	defer srv.Close()

	c := newTestClient(srv.URL)
	vn, err := c.GetVN(context.Background(), "v123")
	if err != nil {
		t.Fatalf("GetVN() error: %v", err)
	}
	if vn.ID != "v123" {
		t.Errorf("expected ID=v123; got %s", vn.ID)
	}
	if vn.Title != sampleVN.Title {
		t.Errorf("expected title=%q; got %q", sampleVN.Title, vn.Title)
	}
	if len(vn.Screenshots) != 1 {
		t.Errorf("expected 1 screenshot; got %d", len(vn.Screenshots))
	}
}

func TestGetVN_NotFound_ReturnsError(t *testing.T) {
	srv := mockVNServer(t, []VN{}, 0, false)
	defer srv.Close()

	c := newTestClient(srv.URL)
	_, err := c.GetVN(context.Background(), "v999")
	if err == nil {
		t.Error("expected error for not-found VN; got nil")
	}
}

func TestGetVN_PopulatesAllFields(t *testing.T) {
	srv := mockVNServer(t, []VN{sampleVN}, 1, false)
	defer srv.Close()

	c := newTestClient(srv.URL)
	vn, err := c.GetVN(context.Background(), "v123")
	if err != nil {
		t.Fatalf("GetVN() error: %v", err)
	}
	if vn.Description != sampleVN.Description {
		t.Errorf("description mismatch: got %q", vn.Description)
	}
	if vn.Image == nil || vn.Image.URL == "" {
		t.Error("expected non-empty image URL")
	}
	if len(vn.Developers) == 0 || vn.Developers[0].Name != "Test Studio" {
		t.Error("developer name mismatch")
	}
	if len(vn.Tags) != 2 {
		t.Errorf("expected 2 tags; got %d", len(vn.Tags))
	}
}

// ─── GetLatestRelease ─────────────────────────────────────────────────────────

func TestGetLatestRelease_ExtractsVersion(t *testing.T) {
	releases := []Release{
		{ID: "r1", Title: "Test Game v1.2.0 Public", Released: "2024-03-01"},
	}
	srv := combinedMockServer(t, nil, releases, 0, false)
	defer srv.Close()

	c := newTestClient(srv.URL)
	r, err := c.GetLatestRelease(context.Background(), "v123")
	if err != nil {
		t.Fatalf("GetLatestRelease() error: %v", err)
	}
	if r == nil {
		t.Fatal("expected a release; got nil")
	}
	if r.Version != "v1.2.0" {
		t.Errorf("expected version=v1.2.0; got %q", r.Version)
	}
}

func TestGetLatestRelease_NoReleases_ReturnsNil(t *testing.T) {
	srv := combinedMockServer(t, nil, nil, 0, false)
	defer srv.Close()

	c := newTestClient(srv.URL)
	r, err := c.GetLatestRelease(context.Background(), "v123")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if r != nil {
		t.Errorf("expected nil release; got %+v", r)
	}
}

func TestGetLatestRelease_FallbackTitle_WhenNoSemver(t *testing.T) {
	releases := []Release{
		{ID: "r2", Title: "Chapter Five - New Beginnings", Released: "2024-01-10"},
	}
	srv := combinedMockServer(t, nil, releases, 0, false)
	defer srv.Close()

	c := newTestClient(srv.URL)
	r, err := c.GetLatestRelease(context.Background(), "v123")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if r.Version != r.Title {
		t.Errorf("expected version to fall back to title; got %q", r.Version)
	}
}

func TestGetLatestRelease_RateLimitResponse_ReturnsError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
	}))
	defer srv.Close()

	c := newTestClient(srv.URL)
	_, err := c.GetLatestRelease(context.Background(), "v123")
	if err == nil {
		t.Error("expected error on 429; got nil")
	}
}
