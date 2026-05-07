package vndb

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

const defaultBaseURL = "https://api.vndb.org/kana"

// adultsOnlyTagID is the VNDB "Sexual content" parent tag.
// Verify at https://vndb.org/g23 — change if incorrect.
const adultsOnlyTagID = "g23"

var versionRe = regexp.MustCompile(`(?i)v?\d+\.\d+[\.\d]*(?:[a-zA-Z]\w*)?`)

func extractVersion(title string) string {
	if m := versionRe.FindString(title); m != "" {
		return m
	}
	return title
}

// cacheEntry holds a cached API response with expiry.
type cacheEntry struct {
	resp      SearchResponse
	expiresAt time.Time
}

// Client wraps the VNDB HTTP API with a rate limiter and response cache.
type Client struct {
	http    *http.Client
	baseURL string

	// Rate limiter: 0.5 req/sec avg (150/5min), burst 10.
	// VNDB allows 200/5min; staying at 75% gives comfortable headroom.
	limiter *rate.Limiter

	mu    sync.RWMutex
	cache map[string]cacheEntry
}

func NewClient() *Client {
	return &Client{
		http:    &http.Client{Timeout: 10 * time.Second},
		baseURL: defaultBaseURL,
		limiter: rate.NewLimiter(rate.Limit(0.5), 10),
		cache:   make(map[string]cacheEntry),
	}
}

// newTestClient creates a Client pointed at a custom URL with a wide-open rate limiter.
// Only for use in tests.
func newTestClient(baseURL string) *Client {
	return &Client{
		http:    &http.Client{Timeout: 5 * time.Second},
		baseURL: baseURL,
		limiter: rate.NewLimiter(rate.Limit(1000), 1000),
		cache:   make(map[string]cacheEntry),
	}
}

type VN struct {
	ID          string         `json:"id"`
	Title       string         `json:"title"`
	Description string         `json:"description"`
	Image       *vnImage       `json:"image"`
	Developers  []vnDev        `json:"developers"`
	Tags        []vnTag        `json:"tags"`
	Screenshots []vnScreenshot `json:"screenshots"`
}

type vnScreenshot struct {
	URL       string `json:"url"`
	Thumbnail string `json:"thumbnail"`
}

type vnImage struct {
	URL string `json:"url"`
}

type vnDev struct {
	Name string `json:"name"`
}

type vnTag struct {
	Name string `json:"name"`
}

type Release struct {
	ID       string `json:"id"`
	Title    string `json:"title"`
	Released string `json:"released"`
	Version  string
}

type SearchResponse struct {
	Results []VN  `json:"results"`
	Count   int   `json:"count"`
	More    bool  `json:"more"`
}

// Search returns VNs by query. Empty query → popular by votecount.
// page is 1-based. adultsOnly adds the sexual content tag filter.
func (c *Client) Search(ctx context.Context, query string, page int, adultsOnly bool) (SearchResponse, error) {
	if page < 1 {
		page = 1
	}

	body := map[string]any{
		"fields":  "id, title, description, image.url, developers.name, tags.name, screenshots.url, screenshots.thumbnail",
		"results": 24,
		"page":    page,
		"count":   true,
	}

	var filters []any
	if query != "" {
		filters = append(filters, []any{"search", "=", query})
	}
	if adultsOnly {
		filters = append(filters, []any{"tag", "=", adultsOnlyTagID})
	}

	switch len(filters) {
	case 0:
		body["sort"] = "votecount"
		body["reverse"] = true
	case 1:
		body["filters"] = filters[0]
		if query == "" {
			body["sort"] = "votecount"
			body["reverse"] = true
		}
	default:
		body["filters"] = append([]any{"and"}, filters...)
	}

	return c.postVN(ctx, body, 3*time.Minute)
}

func (c *Client) GetVN(ctx context.Context, vndbID string) (*VN, error) {
	body := map[string]any{
		"filters": []any{"id", "=", vndbID},
		"fields":  "id, title, description, image.url, developers.name, tags.name, screenshots.url, screenshots.thumbnail",
		"results": 1,
	}
	resp, err := c.postVN(ctx, body, 15*time.Minute)
	if err != nil {
		return nil, err
	}
	if len(resp.Results) == 0 {
		return nil, fmt.Errorf("VNDB: VN %s not found", vndbID)
	}
	return &resp.Results[0], nil
}

func (c *Client) GetLatestRelease(ctx context.Context, vndbID string) (*Release, error) {
	body := map[string]any{
		"filters": []any{"vn", "=", []any{"id", "=", vndbID}},
		"fields":  "id, title, released",
		"sort":    "released",
		"reverse": true,
		"results": 1,
	}

	b, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	// Rate-limit before calling the release endpoint too.
	if err := c.limiter.Wait(ctx); err != nil {
		return nil, fmt.Errorf("rate limiter: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/release", bytes.NewReader(b))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusTooManyRequests {
		return nil, fmt.Errorf("VNDB rate limit hit, try again shortly")
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("VNDB release API status %d", resp.StatusCode)
	}

	var out struct {
		Results []Release `json:"results"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	if len(out.Results) == 0 {
		return nil, nil
	}
	r := &out.Results[0]
	r.Version = extractVersion(r.Title)
	return r, nil
}

// postVN sends a POST to /vn, applying rate limiting and caching with the given TTL.
func (c *Client) postVN(ctx context.Context, body map[string]any, cacheTTL time.Duration) (SearchResponse, error) {
	b, err := json.Marshal(body)
	if err != nil {
		return SearchResponse{}, err
	}

	key := cacheKey(b)

	// Check cache first.
	if cached, ok := c.getCache(key); ok {
		return cached, nil
	}

	// Wait for rate-limit token before hitting the API.
	if err := c.limiter.Wait(ctx); err != nil {
		// Context cancelled or deadline exceeded — return stale cache if any.
		if stale, ok := c.getStaleCache(key); ok {
			return stale, nil
		}
		return SearchResponse{}, fmt.Errorf("rate limiter: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/vn", bytes.NewReader(b))
	if err != nil {
		return SearchResponse{}, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		// Network error — return stale cache if available.
		if stale, ok := c.getStaleCache(key); ok {
			return stale, nil
		}
		return SearchResponse{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusTooManyRequests {
		// 429 — return stale cache if available, else error.
		if stale, ok := c.getStaleCache(key); ok {
			return stale, nil
		}
		return SearchResponse{}, fmt.Errorf("VNDB rate limit hit, try again shortly")
	}
	if resp.StatusCode != http.StatusOK {
		return SearchResponse{}, fmt.Errorf("VNDB vn API status %d", resp.StatusCode)
	}

	var out SearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return SearchResponse{}, err
	}

	c.setCache(key, out, cacheTTL)
	return out, nil
}

func cacheKey(body []byte) string {
	sum := sha256.Sum256(body)
	return fmt.Sprintf("%x", sum)
}

func (c *Client) getCache(key string) (SearchResponse, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	e, ok := c.cache[key]
	if !ok || time.Now().After(e.expiresAt) {
		return SearchResponse{}, false
	}
	return e.resp, true
}

// getStaleCache returns an expired entry when we have no better option (rate limited / error).
func (c *Client) getStaleCache(key string) (SearchResponse, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	e, ok := c.cache[key]
	return e.resp, ok
}

func (c *Client) setCache(key string, resp SearchResponse, ttl time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.cache[key] = cacheEntry{resp: resp, expiresAt: time.Now().Add(ttl)}

	// Evict expired entries while we hold the write lock.
	now := time.Now()
	for k, e := range c.cache {
		if now.After(e.expiresAt) {
			delete(c.cache, k)
		}
	}
}
