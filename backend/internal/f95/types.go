package f95

// Game holds data scraped from an F95Zone thread page.
type Game struct {
	ThreadID    string
	ThreadURL   string
	Title       string
	Developer   string
	Version     string
	CoverURL    string
	Description string
	Tags        []string
	Engine      string
	Status      string // "Ongoing", "Complete", "Abandoned"
	Screenshots []string
}

// SearchItem holds lightweight data from F95Zone search results (no per-thread fetch).
type SearchItem struct {
	ThreadID  string
	ThreadURL string
	Title     string
	Version   string
	Engine    string
	Tags      []string
}

// SearchPage wraps a page of search results with pagination metadata.
type SearchPage struct {
	Items      []*SearchItem
	TotalPages int
}
