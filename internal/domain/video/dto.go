package video

type ProcessVideoDTO struct {
	Filename     string
	OriginalName string
	Path         string
	Folder       string
}

type RenameVideoDTO struct {
	Name string `json:"name"`
}

type MoveVideoDTO struct {
	Folder string `json:"folder"`
}
