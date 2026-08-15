package graph

import "testing"

func TestPickLinkTitle(t *testing.T) {
	cases := []struct {
		input string
		want  string
	}{
		// Real titles — should pass through
		{"My Awesome List", "My Awesome List"},
		{"Top 10 AVNs of 2024", "Top 10 AVNs of 2024"},
		{"r/visualnovels – Best games", "r/visualnovels – Best games"},

		// Whitespace stripping
		{"  Trimmed Title  ", "Trimmed Title"},
		{"\t\nSome Title\t\n", "Some Title"},

		// Empty / whitespace only — should return ""
		{"", ""},
		{"   ", ""},

		// Known generic SPA placeholders — should return ""
		{"Notion", ""},
		{"notion", ""},
		{"NOTION", ""},
		{"Google Docs", ""},
		{"google docs", ""},
		{"Google Drive", ""},
		{"Google Sheets", ""},
		{"Google Slides", ""},
		{"Untitled", ""},
		{"untitled", ""},

		// Titles that contain a generic word but aren't the exact placeholder
		{"Notion — My List", "Notion — My List"},
		{"My Google Docs Guide", "My Google Docs Guide"},
		{"Untitled Project Ideas", "Untitled Project Ideas"},
	}

	for _, c := range cases {
		t.Run(c.input, func(t *testing.T) {
			got := pickLinkTitle(c.input)
			if got != c.want {
				t.Errorf("pickLinkTitle(%q) = %q; want %q", c.input, got, c.want)
			}
		})
	}
}
