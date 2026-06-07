package video

import "github.com/google/uuid"

type VideoView struct {
	ID        uuid.UUID `json:"id"`
	Filename  string    `json:"filename"`
	Folder    string    `json:"folder"`
	Size      int64     `json:"size"`
	Thumbnail string    `json:"thumbnail"`
	Duration  int       `json:"duration"`
}

func ToVideoView(v *Video) VideoView {
	return VideoView{
		ID:        v.ID,
		Filename:  v.Filename,
		Folder:    v.Folder,
		Size:      v.Size,
		Thumbnail: v.Thumbnail,
		Duration:  v.Duration,
	}
}

func ToVideoViews(videos []*Video) []VideoView {
	views := make([]VideoView, len(videos))
	for i, v := range videos {
		views[i] = ToVideoView(v)
	}
	return views
}
