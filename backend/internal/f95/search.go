package f95

import (
	"context"
	"fmt"
	"log"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
)

const searchURL = baseURL + "/search/search/"

// gamesForumID is the XenForo node ID for the F95Zone Games/Adult Games forum.
// Confirmed from @millenniumearl/f95api source: categoryToID("games") = 2.
const gamesForumID = "2"

// searchIDRe extracts the numeric search ID from XenForo search result URLs.
// e.g. "/search/665874710/?q=..." → "665874710"
var searchIDRe = regexp.MustCompile(`/search/(\d+)/`)

// Search fetches a page of F95Zone search results for the given query.
//
// Page 1 does a fresh POST to XenForo's search endpoint, which creates a new
// search session and returns the first page. The resulting search ID is cached
// so that subsequent page requests can GET the pre-computed results without
// POSTing again (which would create a new search each time).
func (c *Client) Search(ctx context.Context, query string, page int) (*SearchPage, error) {
	if !c.IsLoggedIn() {
		return nil, fmt.Errorf("not logged in to F95Zone")
	}

	normalizedQuery := strings.ToLower(strings.TrimSpace(query))

	var body []byte

	if page <= 1 {
		// Page 1: POST to create a fresh search session.
		if err := c.fetchXFToken(ctx); err != nil {
			return nil, fmt.Errorf("refresh token: %w", err)
		}
		token := c.getStoredToken()
		if token == "" {
			return nil, fmt.Errorf("no _xfToken available — login may have failed")
		}

		form := url.Values{}
		form.Set("_xfToken", token)
		form.Set("keywords", query)
		form.Set("search_type", "thread")
		form.Set("c[child_nodes]", "1")
		form.Set("c[nodes][0]", gamesForumID)
		form.Set("order", "relevance")

		log.Printf("[F95] Search POST to %s (keywords=%q, token=%s…)", searchURL, query, token[:min(len(token), 8)])

		var err error
		body, err = c.postForm(ctx, searchURL, form)
		if err != nil {
			return nil, fmt.Errorf("search POST: %w", err)
		}
	} else {
		// Page 2+: GET the pre-computed search results using the cached search ID.
		c.mu.RLock()
		searchID := c.searchIDCache[normalizedQuery]
		c.mu.RUnlock()

		if searchID == "" {
			return nil, fmt.Errorf("no cached search session for %q — search page 1 first", query)
		}

		pageURL := fmt.Sprintf("%s/search/%s/?page=%d&q=%s&o=relevance",
			baseURL, searchID, page, url.QueryEscape(query))

		log.Printf("[F95] Search GET page %d: %s", page, pageURL)

		var err error
		body, err = c.fetchPage(ctx, pageURL, 5*time.Minute)
		if err != nil {
			return nil, fmt.Errorf("search GET page %d: %w", page, err)
		}
	}

	log.Printf("[F95] Search response: %d bytes", len(body))

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(string(body)))
	if err != nil {
		return nil, fmt.Errorf("parse search response: %w", err)
	}

	pageTitle := strings.TrimSpace(doc.Find("title").Text())
	log.Printf("[F95] Search page title: %q", pageTitle)

	errorMsg := strings.TrimSpace(doc.Find("div.p-body-pageContent > div.blockMessage").First().Text())
	if errorMsg != "" {
		log.Printf("[F95] Search page error: %q", errorMsg)
	}

	// On page 1, extract and cache the XenForo search ID so page 2+ can GET
	// the pre-computed results without triggering a new POST search.
	if page <= 1 {
		doc.Find("ul.pageNav-main li.pageNav-page a").Each(func(_ int, s *goquery.Selection) {
			href, _ := s.Attr("href")
			if m := searchIDRe.FindStringSubmatch(href); len(m) > 1 {
				id := m[1]
				c.mu.Lock()
				c.searchIDCache[normalizedQuery] = id
				c.mu.Unlock()
				return
			}
		})
	}

	// Parse total page count from the last non-skip page number in the paginator.
	totalPages := 1
	doc.Find("ul.pageNav-main li.pageNav-page:not(.pageNav-page--skip) a").Each(func(_ int, s *goquery.Selection) {
		if n, err := strconv.Atoi(strings.TrimSpace(s.Text())); err == nil && n > totalPages {
			totalPages = n
		}
	})

	// THREAD_SEARCH.BODY = "div.contentRow-main" (from css-selector.ts)
	rows := doc.Find("div.contentRow-main")
	log.Printf("[F95] Search rows found: %d", rows.Length())

	if rows.Length() == 0 && len(body) > 0 {
		snippet := string(body)
		if len(snippet) > 2000 {
			snippet = snippet[:2000]
		}
		log.Printf("[F95] Response snippet:\n%s", snippet)
	}

	var items []*SearchItem
	seen := map[string]bool{} // deduplicate by threadID

	// THREAD_SEARCH.THREAD_TITLE = "h3.contentRow-title > a" (from css-selector.ts)
	rows.Each(func(_ int, s *goquery.Selection) {
		titleEl := s.Find("h3.contentRow-title > a").First()
		href, exists := titleEl.Attr("href")
		if !exists || href == "" {
			return
		}
		if !strings.Contains(href, "/threads/") {
			return
		}
		if !strings.HasPrefix(href, "http") {
			href = baseURL + href
		}

		// Normalize URL to thread root (strip /post-XXXXX anchor).
		threadURL := href
		if idx := strings.Index(threadURL, "/post-"); idx >= 0 {
			threadURL = threadURL[:idx+1] // keep trailing slash
		}

		threadID := ""
		if m := threadIDRe.FindStringSubmatch(threadURL); len(m) > 1 {
			threadID = m[1]
		}

		// Deduplicate: multiple posts from same thread appear in search results.
		dedupeKey := threadID
		if dedupeKey == "" {
			dedupeKey = threadURL
		}
		if seen[dedupeKey] {
			return
		}
		seen[dedupeKey] = true

		// F95Zone search result title structure (from live HTML):
		//   <a href="/threads/...">
		//     <span class="pre-renpy" dir="auto">Ren'Py</span>  ← engine prefix
		//     <span class="label-append"> </span>               ← separator
		//     <span class="label">VN</span>                     ← type/status label
		//     Game Title [vX.Y] [Dev]
		//   </a>
		//
		// Engine: span whose class starts with "pre-" (e.g. pre-renpy, pre-unity)
		// Type/Status: span.label or a.labelLink (e.g. VN, Abandoned, Completed)

		engine := ""
		var prefixTags []string

		// Extract engine from pre-* spans.
		titleEl.Find("span").Each(func(_ int, sp *goquery.Selection) {
			cls := sp.AttrOr("class", "")
			if strings.HasPrefix(cls, "pre-") {
				if text := strings.TrimSpace(sp.Text()); text != "" && engine == "" {
					engine = text
				}
			}
		})

		// Extract type/status labels from .label / .labelLink elements.
		titleEl.Find(".label, .labelLink").Each(func(_ int, lbl *goquery.Selection) {
			if text := strings.TrimSpace(lbl.Text()); text != "" {
				prefixTags = append(prefixTags, text)
			}
		})

		// Clone and strip all prefix spans + separator to get clean title text.
		titleClone := titleEl.Clone()
		titleClone.Find("span").Each(func(_ int, sp *goquery.Selection) {
			cls := sp.AttrOr("class", "")
			if strings.HasPrefix(cls, "pre-") || strings.Contains(cls, "label-append") {
				sp.Remove()
			}
		})
		titleClone.Find(".label, .labelLink").Remove()
		rawTitle := strings.TrimSpace(titleClone.Text())

		version := extractVersion(rawTitle)

		title := cleanBrackets(rawTitle)

		// Prefix tags first so type/status labels appear before content tags.
		tags := prefixTags
		s.Find(".tagList .tagItem a, a.tagItem").Each(func(_ int, tEl *goquery.Selection) {
			if t := strings.TrimSpace(tEl.Text()); t != "" {
				tags = append(tags, t)
			}
		})
		if tags == nil {
			tags = []string{}
		}

		items = append(items, &SearchItem{
			ThreadID:  threadID,
			ThreadURL: threadURL,
			Title:     title,
			Version:   version,
			Engine:    engine,
			Tags:      tags,
		})
	})

	return &SearchPage{Items: items, TotalPages: totalPages}, nil
}
