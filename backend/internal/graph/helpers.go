package graph

import (
	"avn-tracker/backend/internal/model"
	"avn-tracker/backend/internal/vndb"
	"strings"
)

// genericPageTitles contains known SPA placeholder titles that don't represent
// the real page content (e.g. Notion renders "Notion" in <title> until JS runs).
var genericPageTitles = map[string]bool{
	"notion":        true,
	"google docs":   true,
	"google drive":  true,
	"google sheets": true,
	"google slides": true,
	"untitled":      true,
}

// pickLinkTitle returns s trimmed if it is non-empty and not a known generic
// SPA placeholder; otherwise returns "".
func pickLinkTitle(s string) string {
	s = strings.TrimSpace(s)
	if s == "" || genericPageTitles[strings.ToLower(s)] {
		return ""
	}
	return s
}

func vnToResult(vn *vndb.VN) *model.VNDBResult {
	coverURL := ""
	if vn.Image != nil {
		coverURL = vn.Image.URL
	}
	developer := ""
	if len(vn.Developers) > 0 {
		developer = vn.Developers[0].Name
	}
	tags := make([]string, 0, len(vn.Tags))
	for _, t := range vn.Tags {
		tags = append(tags, t.Name)
	}
	shots := make([]*model.VNDBScreenshot, 0, len(vn.Screenshots))
	for _, s := range vn.Screenshots {
		thumb := s.Thumbnail
		if thumb == "" {
			thumb = s.URL
		}
		shots = append(shots, &model.VNDBScreenshot{Thumbnail: thumb, URL: s.URL})
	}
	return &model.VNDBResult{
		VndbID:      vn.ID,
		Title:       vn.Title,
		Developer:   developer,
		CoverURL:    coverURL,
		Tags:        tags,
		Description: vn.Description,
		Screenshots: shots,
	}
}
