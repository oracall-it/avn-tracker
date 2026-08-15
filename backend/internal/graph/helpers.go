package graph

import (
	"avn-tracker/backend/internal/model"
	"avn-tracker/backend/internal/vndb"
)

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
