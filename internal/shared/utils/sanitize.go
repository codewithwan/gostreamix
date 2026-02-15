package utils

import (
	"github.com/microcosm-cc/bluemonday"
)

var p = bluemonday.UGCPolicy()

// SanitizeHTML removes dangerous HTML from a string.
func SanitizeHTML(s string) string {
	return p.Sanitize(s)
}

// SanitizeStrict removes ALL HTML from a string.
func SanitizeStrict(s string) string {
	return bluemonday.StrictPolicy().Sanitize(s)
}
