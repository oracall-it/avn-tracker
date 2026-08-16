package f95

import (
	stdhtml "html"
	"context"
	"regexp"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
)

var (
	// Matches thread ID in F95Zone thread URL.
	// Supports both slug.ID format (/threads/title.12345/) and bare ID (/threads/12345/).
	threadIDRe = regexp.MustCompile(`/threads/(?:[^/]*\.)?(\d+)`)

	// Matches every [...] group in a title string.
	allBracketsRe = regexp.MustCompile(`\[([^\]]+)\]`)

	// Known engine prefix labels used in F95Zone thread titles.
	engineLabels = map[string]bool{
		"ren'py": true, "renpy": true, "unity": true, "rpgm": true,
		"html": true, "flash": true, "java": true, "unreal engine": true,
		"twine": true, "godot": true, "wolf rpg": true, "other": true,
	}

	// Status labels.
	completeLabels  = map[string]bool{"completed": true, "complete": true}
	abandonedLabels = map[string]bool{"abandoned": true, "on hold": true, "onhold": true}

	// Content-type labels that appear in brackets but are not version strings.
	contentTypeLabels = map[string]bool{
		"vn": true, "game": true, "mod": true, "asset": true, "comic": true, "animation": true,
	}

	// Regexes for HTML → plain-text conversion.
	htmlTagRe  = regexp.MustCompile(`<[^>]+>`)
	noscriptRe = regexp.MustCompile(`(?si)<noscript>.*?</noscript>`) // noscript holds raw <img> as text
	brRe       = regexp.MustCompile(`(?i)<br\s*/?>`)

	// Known metadata section labels — used to bound the Overview extraction.
	metaLabels = []string{
		"thread updated", "release date", "developer", "developer/publisher",
		"censored", "version", "os", "language", "genre", "installation",
		"changelog", "change-log", "fan art", "other games",
	}
)

// extractVersion picks the version string from an F95Zone thread title by collecting
// all [...] bracket contents, discarding known non-version labels (engine, status,
// content type), and returning the last remaining bracket value.
// This accepts any format: [v1.2], [Ep. 3], [Chapter 5 Part 2], [Final], etc.
func extractVersion(rawTitle string) string {
	var candidates []string
	for _, m := range allBracketsRe.FindAllStringSubmatch(rawTitle, -1) {
		content := strings.TrimSpace(m[1])
		lower := strings.ToLower(content)
		if engineLabels[lower] || completeLabels[lower] || abandonedLabels[lower] || contentTypeLabels[lower] {
			continue
		}
		candidates = append(candidates, content)
	}
	if len(candidates) == 0 {
		return ""
	}
	return candidates[0]
}

// GetGame fetches and parses a single F95Zone thread page.
func (c *Client) GetGame(ctx context.Context, threadURL string) (*Game, error) {
	body, err := c.fetchPage(ctx, threadURL, 15*time.Minute)
	if err != nil {
		return nil, err
	}

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(string(body)))
	if err != nil {
		return nil, err
	}

	threadID := ""
	if m := threadIDRe.FindStringSubmatch(threadURL); len(m) > 1 {
		threadID = m[1]
	}

	// --- Title ---
	// Clone h1 so we don't mutate the document. Remove all label elements.
	titleClone := doc.Find("h1.p-title-value").First().Clone()
	titleClone.Find(".label, .labelLink, .p-title-pageAction").Remove()
	titleClone.Find("span").Each(func(_ int, s *goquery.Selection) {
		if strings.HasPrefix(s.AttrOr("class", ""), "pre-") {
			s.Remove()
		}
	})
	rawTitle := strings.TrimSpace(titleClone.Text())

	// --- Version ---
	version := extractVersion(rawTitle)
	title := cleanBrackets(rawTitle)

	// --- Engine + Status from h1 labels ---
	// Thread pages use a.labelLink > span[dir="auto"] for prefix labels.
	engine := ""
	f95Status := "Ongoing"
	doc.Find("h1.p-title-value a.labelLink").Each(func(_ int, s *goquery.Selection) {
		text := strings.TrimSpace(s.Find(`span[dir="auto"]`).Text())
		if text == "" {
			text = strings.TrimSpace(s.Text())
		}
		lower := strings.ToLower(text)
		if engineLabels[lower] && engine == "" {
			engine = text
		} else if completeLabels[lower] {
			f95Status = "Complete"
		} else if abandonedLabels[lower] {
			f95Status = "Abandoned"
		}
	})
	// Fallback: span.pre-{engine} (some pages render it this way).
	if engine == "" {
		doc.Find("h1.p-title-value span").Each(func(_ int, s *goquery.Selection) {
			if strings.HasPrefix(s.AttrOr("class", ""), "pre-") && engine == "" {
				engine = strings.TrimSpace(s.Text())
			}
		})
	}

	// --- First post body (needed for genre + metadata extraction) ---
	firstPost := doc.Find("article.message").First()
	postBody := firstPost.Find(".message-body .bbWrapper")
	postHTML, _ := postBody.Html()

	// --- Genre/Tags: parsed from <b>Genre</b>: spoiler in post body.
	// F95Zone genre list lives inside a bbCodeSpoiler immediately following
	// the Genre label, not in the thread-level .tagList.
	tags := extractGenreTags(postBody)

	// --- Cover: first img.bbImage with a valid URL ---
	// F95Zone uses lazy loading: actual URL is in data-src, src is an SVG placeholder.
	coverURL := extractCoverURL(postBody)

	// --- Developer: name only, no platform links ---
	developer := extractDeveloperField(postHTML)

	// --- Overview/description ---
	description := extractOverviewField(postHTML)

	// --- Screenshots: all img.bbImage except cover, up to 30 ---
	screenshots := extractScreenshots(postBody, coverURL)


	return &Game{
		ThreadID:    threadID,
		ThreadURL:   threadURL,
		Title:       title,
		Developer:   developer,
		Version:     version,
		CoverURL:    coverURL,
		Description: description,
		Tags:        tags,
		Engine:      engine,
		Status:      f95Status,
		Screenshots: screenshots,
	}, nil
}

// extractCoverURL returns the full-size URL of the first image in the post body.
// The banner/cover is always the first img.bbImage and its data-src is already
// full-size (no /thumb/ segment). Falls back to lbContainer-zoomer if needed.
func extractCoverURL(postBody *goquery.Selection) string {
	// First img.bbImage[data-src] is the banner — full-size, no /thumb/.
	coverURL := ""
	postBody.Find("img.bbImage").EachWithBreak(func(_ int, img *goquery.Selection) bool {
		if src, ok := img.Attr("data-src"); ok && isFullURL(src) {
			coverURL = thumbToFullSize(src)
			return false
		}
		return true
	})
	if coverURL != "" {
		return coverURL
	}
	// Fallback: lbContainer-zoomer (lightbox full-size anchor).
	postBody.Find(".lbContainer-zoomer").EachWithBreak(func(_ int, z *goquery.Selection) bool {
		if src, ok := z.Attr("data-src"); ok && isFullURL(src) {
			coverURL = src
			return false
		}
		return true
	})
	return coverURL
}

// extractDeveloperField finds "Developer: NAME <links...>" and returns only NAME.
// It takes text before the first platform <a> link on the developer line.
func extractDeveloperField(postHTML string) string {
	lower := strings.ToLower(postHTML)
	labels := []string{"<b>developer</b>:", "<b>developer/publisher</b>:", "<b>artist</b>:"}

	idx, matchLen := -1, 0
	for _, pat := range labels {
		if i := strings.Index(lower, pat); i >= 0 && (idx == -1 || i < idx) {
			idx = i
			matchLen = len(pat)
		}
	}
	if idx == -1 {
		return ""
	}

	after := strings.TrimLeft(postHTML[idx+matchLen:], " \t\n")

	// Stop before the first platform link or line break.
	stopAt := len(after)
	for _, stop := range []string{"<a ", "<a\n", "<br", "\n", "<div"} {
		if i := strings.Index(strings.ToLower(after), stop); i >= 0 && i < stopAt {
			stopAt = i
		}
	}

	name := htmlTagRe.ReplaceAllString(after[:stopAt], "")
	name = stdhtml.UnescapeString(name)
	return strings.TrimSpace(strings.Trim(name, ":-. "))
}

// extractOverviewField finds the "Overview:" section and returns its text.
func extractOverviewField(postHTML string) string {
	lower := strings.ToLower(postHTML)
	// Try common overview/story/description/synopsis labels.
	// Each variant covers colon outside (<b>label</b>:), colon inside (<b>label:</b>), and no colon.
	patterns := []string{
		"<b>overview</b>:", "<b>story</b>:", "<b>description</b>:", "<b>synopsis</b>:", "<b>plot</b>:",
		"<b>overview:</b>", "<b>story:</b>", "<b>description:</b>", "<b>synopsis:</b>", "<b>plot:</b>",
		"<b>overview</b>", "<b>story</b>", "<b>description</b>", "<b>synopsis</b>", "<b>plot</b>",
	}

	idx, matchLen := -1, 0
	for _, pat := range patterns {
		if i := strings.Index(lower, pat); i >= 0 && (idx == -1 || i < idx) {
			idx = i
			matchLen = len(pat)
		}
	}
	if idx == -1 {
		return ""
	}

	after := postHTML[idx+matchLen:]
	after = strings.TrimLeft(after, ": \t\n")

	// Find where the next metadata section starts.
	lowerAfter := strings.ToLower(after)
	endIdx := len(after)
	for _, label := range metaLabels {
		needle := "<b>" + label + "</b>"
		if i := strings.Index(lowerAfter, needle); i >= 0 && i < endIdx {
			endIdx = i
		}
	}

	return htmlToText(after[:endIdx])
}

// extractScreenshots returns full-size screenshot URLs, excluding the cover.
// All images use img.bbImage[data-src]. Screenshot thumbnails have /thumb/ in
// the path; stripping it yields the full-size attachment URL.
func extractScreenshots(postBody *goquery.Selection, coverURL string) []string {
	// Normalise the cover URL so we can deduplicate against it even if the
	// cover was extracted via the lbContainer-zoomer (which may already be
	// the full-size while the img data-src is the thumbnail).
	seen := map[string]bool{"": true}
	if coverURL != "" {
		seen[coverURL] = true
		seen[thumbToFullSize(coverURL)] = true
	}
	var screenshots []string

	postBody.Find("img.bbImage").Each(func(_ int, img *goquery.Selection) {
		src := img.AttrOr("data-src", "")
		if src == "" || !isFullURL(src) {
			return
		}
		full := thumbToFullSize(src)
		if seen[full] {
			return
		}
		seen[full] = true
		if len(screenshots) < 30 {
			screenshots = append(screenshots, full)
		}
	})

	if screenshots == nil {
		screenshots = []string{}
	}
	return screenshots
}

// thumbToFullSize converts an F95Zone thumbnail URL to its full-size equivalent
// by removing the /thumb/ path segment.
// e.g. .../2025/03/thumb/img.jpg → .../2025/03/img.jpg
func thumbToFullSize(url string) string {
	return strings.Replace(url, "/thumb/", "/", 1)
}

// htmlToText strips HTML tags and decodes entities, replacing <br> with newlines.
// Noscript blocks are removed first — they contain raw <img> HTML as literal text
// because Go's HTML parser treats noscript content as text nodes.
func htmlToText(h string) string {
	h = noscriptRe.ReplaceAllString(h, "")
	h = brRe.ReplaceAllString(h, "\n")
	h = htmlTagRe.ReplaceAllString(h, "")
	h = stdhtml.UnescapeString(h)
	h = strings.ReplaceAll(h, "​", "") // zero-width space
	// Collapse runs of blank lines.
	lines := strings.Split(h, "\n")
	var out []string
	for _, l := range lines {
		t := strings.TrimSpace(l)
		if t != "" {
			out = append(out, t)
		}
	}
	return strings.Join(out, "\n")
}

// cleanBrackets removes all [...] segments from a string.
func cleanBrackets(s string) string {
	depth := 0
	var b strings.Builder
	for _, ch := range s {
		switch ch {
		case '[':
			depth++
		case ']':
			if depth > 0 {
				depth--
			}
		default:
			if depth == 0 {
				b.WriteRune(ch)
			}
		}
	}
	return strings.TrimSpace(strings.Join(strings.Fields(b.String()), " "))
}

// extractGenreTags finds <b>Genre</b>: in the post body and parses the comma-
// separated genre list from the bbCodeSpoiler that follows it.
func extractGenreTags(postBody *goquery.Selection) []string {
	var genres []string

	postBody.Find("b").Each(func(_ int, b *goquery.Selection) {
		if len(genres) > 0 || strings.ToLower(strings.TrimSpace(b.Text())) != "genre" {
			return
		}
		// The spoiler div is a following sibling of the <b>Genre</b> element.
		b.NextAll().Each(func(_ int, sib *goquery.Selection) {
			if len(genres) > 0 || !sib.HasClass("bbCodeSpoiler") {
				return
			}
			text := strings.TrimSpace(sib.Find(".bbCodeBlock-content").First().Text())
			for _, g := range strings.Split(text, ",") {
				if g = strings.TrimSpace(g); g != "" {
					genres = append(genres, g)
				}
			}
		})
	})

	if genres == nil {
		genres = []string{}
	}
	return genres
}

func isFullURL(s string) bool {
	return strings.HasPrefix(s, "http://") || strings.HasPrefix(s, "https://")
}
