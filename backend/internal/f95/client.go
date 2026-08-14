package f95

import (
	"context"
	"io"
	"log"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/PuerkitoBio/goquery"
	"golang.org/x/time/rate"
)

const baseURL = "https://f95zone.to"

type cacheEntry struct {
	body      []byte
	expiresAt time.Time
}

type Client struct {
	http     *http.Client
	limiter  *rate.Limiter
	mu       sync.RWMutex
	cache    map[string]cacheEntry
	loggedIn bool
	token    string // _xfToken CSRF token, required for all POST requests
}

func NewClient() *Client {
	jar, _ := cookiejar.New(nil)
	return &Client{
		http: &http.Client{
			Timeout: 20 * time.Second,
			Jar:     jar,
		},
		limiter: rate.NewLimiter(rate.Limit(1.0), 5),
		cache:   make(map[string]cacheEntry),
	}
}

func (c *Client) IsLoggedIn() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.loggedIn
}

func (c *Client) setLoggedIn(v bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.loggedIn = v
}

func (c *Client) setToken(t string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.token = t
}

func (c *Client) getStoredToken() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.token
}

// fetchXFToken GETs the base homepage and parses a fresh _xfToken.
// XenForo embeds the token in every page; using the homepage avoids
// hitting the login page unnecessarily.
func (c *Client) fetchXFToken(ctx context.Context) error {
	if err := c.limiter.Wait(ctx); err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, baseURL, nil)
	if err != nil {
		return err
	}
	setHeaders(req, baseURL)

	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return err
	}

	token, exists := doc.Find(`input[name="_xfToken"]`).Attr("value")
	if !exists || token == "" {
		// Not logged in or page changed — token missing is non-fatal here.
		log.Printf("[F95] Warning: _xfToken not found on homepage")
		return nil
	}

	c.setToken(token)
	log.Printf("[F95] Refreshed _xfToken")
	return nil
}

// postForm sends a rate-limited POST request and returns the response body.
// It does NOT cache results (search results should always be fresh).
func (c *Client) postForm(ctx context.Context, targetURL string, form url.Values) ([]byte, error) {
	if err := c.limiter.Wait(ctx); err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, targetURL, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	setHeaders(req, baseURL)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	return io.ReadAll(resp.Body)
}

// fetchPage GETs a URL with caching and rate-limiting.
func (c *Client) fetchPage(ctx context.Context, url string, ttl time.Duration) ([]byte, error) {
	if cached, ok := c.getCache(url); ok {
		return cached, nil
	}

	if err := c.limiter.Wait(ctx); err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	setHeaders(req, url)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	c.setCache(url, body, ttl)
	return body, nil
}

func (c *Client) getCache(key string) ([]byte, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	e, ok := c.cache[key]
	if !ok || time.Now().After(e.expiresAt) {
		return nil, false
	}
	return e.body, true
}

func (c *Client) setCache(key string, body []byte, ttl time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.cache[key] = cacheEntry{body: body, expiresAt: time.Now().Add(ttl)}

	now := time.Now()
	for k, e := range c.cache {
		if now.After(e.expiresAt) {
			delete(c.cache, k)
		}
	}
}

// InvalidateCache removes the cached page for a given URL.
func (c *Client) InvalidateCache(url string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.cache, url)
}
