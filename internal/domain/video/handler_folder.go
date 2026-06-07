package video

import "strings"

func normalizeFolder(raw string) string {
	folder := strings.TrimSpace(strings.ReplaceAll(raw, "\\", "/"))
	folder = strings.Trim(folder, "/")
	if folder == "" {
		return ""
	}

	parts := strings.Split(folder, "/")
	clean := make([]string, 0, len(parts))
	for _, part := range parts {
		part = sanitizeFolderPart(part)
		if part == "" || part == "." || part == ".." {
			continue
		}
		clean = append(clean, part)
		if len(clean) >= 4 {
			break
		}
	}

	return strings.Join(clean, "/")
}

func sanitizeFolderPart(part string) string {
	part = strings.TrimSpace(part)
	if part == "" {
		return ""
	}

	var builder strings.Builder
	for _, r := range part {
		if isSafeFolderRune(r) {
			builder.WriteRune(r)
		}
	}
	return strings.TrimSpace(builder.String())
}

func isSafeFolderRune(r rune) bool {
	return (r >= 'a' && r <= 'z') ||
		(r >= 'A' && r <= 'Z') ||
		(r >= '0' && r <= '9') ||
		r == '-' ||
		r == '_' ||
		r == ' ' ||
		r == '.'
}
