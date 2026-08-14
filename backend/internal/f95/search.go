package f95

import (
	"context"
	"fmt"
	"log"
	"net/url"
	"strings"

	"github.com/PuerkitoBio/goquery"
)

const searchURL = baseURL + "/search/search/"

// gamesForumID is the XenForo node ID for the F95Zone Games/Adult Games forum.
// Confirmed from @millenniumearl/f95api source: categoryToID("games") = 2.
const gamesForumID = "2"

// Search performs a POST to the XenForo search endpoint and returns thread listings.
// XenForo search requires a valid _xfToken with every POST — we refresh it first.
func (c *Client) Search(ctx context.Context, query string, page int) ([]*SearchItem, error) {
	if !c.IsLoggedIn() {
		return nil, fmt.Errorf("not logged in to F95Zone")
	}

	// Refresh the CSRF token before every POST. Without a synchronized
	// _xfToken + xf_csrf pair, XenForo returns a "Security error" 400.
	if err := c.fetchXFToken(ctx); err != nil {
		return nil, fmt.Errorf("refresh token: %w", err)
	}

	token := c.getStoredToken()
	if token == "" {
		return nil, fmt.Errorf("no _xfToken available — login may have failed")
	}

	// Build POST form. Standard URL encoding is fine for POST bodies — XenForo
	// parses percent-encoded bracket keys (c%5Bnodes%5D%5B0%5D) correctly.
	// This mirrors how @millenniumearl/f95api uses URLSearchParams.
	form := url.Values{}
	form.Set("_xfToken", token)
	form.Set("keywords", query)
	form.Set("search_type", "post")
	form.Set("c[child_nodes]", "1")
	form.Set("c[nodes][0]", gamesForumID)
	form.Set("order", "relevance")
	if page > 1 {
		form.Set("page", fmt.Sprintf("%d", page))
	}

	log.Printf("[F95] Search POST to %s (keywords=%q, token=%s…)", searchURL, query, token[:min(len(token), 8)])

	body, err := c.postForm(ctx, searchURL, form)
	if err != nil {
		return nil, fmt.Errorf("search POST: %w", err)
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

		version := ""
		if m := versionBracketRe.FindStringSubmatch(rawTitle); len(m) > 1 {
			v := strings.TrimSpace(m[1])
			if !strings.HasPrefix(strings.ToLower(v), "v") {
				v = "v" + v
			}
			version = v
		}

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

	return items, nil
}
