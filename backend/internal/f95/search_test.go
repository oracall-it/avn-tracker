package f95

import (
	"testing"
)

// ─── cleanBrackets ────────────────────────────────────────────────────────────

func TestCleanBrackets(t *testing.T) {
	cases := []struct {
		input string
		want  string
	}{
		{"Game Title [v1.0]", "Game Title"},
		{"Game [v1.0] Title", "Game Title"},
		{"[v1.0] Game Title", "Game Title"},
		{"Game Title", "Game Title"},
		{"Game [v1.0] [Abandoned]", "Game"},
		{"  Game  [v1.0]  ", "Game"},
		{"Nested [[v1.0]] brackets", "Nested brackets"},
		{"", ""},
		{"[only brackets]", ""},
		{"Game [v1.0][Completed] Title", "Game Title"},
	}

	for _, c := range cases {
		t.Run(c.input, func(t *testing.T) {
			got := cleanBrackets(c.input)
			if got != c.want {
				t.Errorf("cleanBrackets(%q) = %q; want %q", c.input, got, c.want)
			}
		})
	}
}

// ─── versionBracketRe ────────────────────────────────────────────────────────

func TestVersionBracketRe(t *testing.T) {
	cases := []struct {
		input string
		want  string // expected capture group 1, or "" for no match
	}{
		{"Game Title [v1.0]", "1.0"},
		{"Game Title [v1.0.3]", "1.0.3"},
		{"Game [Version 2.1]", "2.1"},
		{"Game [v0.21.0 Public]", "0.21.0 Public"},
		{"Game [1.2.3]", "1.2.3"},
		{"Game Title", ""},    // no brackets
		{"Game [Abandoned]", ""},  // no version pattern
		{"Game [VN]", ""},         // label, not version
	}

	for _, c := range cases {
		t.Run(c.input, func(t *testing.T) {
			m := versionBracketRe.FindStringSubmatch(c.input)
			got := ""
			if len(m) > 1 {
				got = m[1]
			}
			if got != c.want {
				t.Errorf("versionBracketRe on %q: capture = %q; want %q", c.input, got, c.want)
			}
		})
	}
}

// ─── searchIDRe ──────────────────────────────────────────────────────────────

func TestSearchIDRe(t *testing.T) {
	cases := []struct {
		input string
		want  string
	}{
		{"/search/665874710/?q=test", "665874710"},
		{"/search/123/?page=2", "123"},
		{"https://f95zone.to/search/987654321/", "987654321"},
		{"/threads/12345/", ""},      // not a search URL
		{"", ""},
	}

	for _, c := range cases {
		t.Run(c.input, func(t *testing.T) {
			m := searchIDRe.FindStringSubmatch(c.input)
			got := ""
			if len(m) > 1 {
				got = m[1]
			}
			if got != c.want {
				t.Errorf("searchIDRe on %q: capture = %q; want %q", c.input, got, c.want)
			}
		})
	}
}

// ─── threadIDRe ──────────────────────────────────────────────────────────────

func TestThreadIDRe(t *testing.T) {
	cases := []struct {
		input string
		want  string
	}{
		{"/threads/game-title.12345/", "12345"},
		{"/threads/12345/", "12345"},
		{"https://f95zone.to/threads/some-game.67890/", "67890"},
		{"https://f95zone.to/threads/67890/", "67890"},
		{"/search/123/", ""},        // not a thread URL
		{"", ""},
	}

	for _, c := range cases {
		t.Run(c.input, func(t *testing.T) {
			m := threadIDRe.FindStringSubmatch(c.input)
			got := ""
			if len(m) > 1 {
				got = m[1]
			}
			if got != c.want {
				t.Errorf("threadIDRe on %q: capture = %q; want %q", c.input, got, c.want)
			}
		})
	}
}
