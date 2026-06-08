package test

import (
	"strings"
	"testing"

	"github.com/codewithwan/gostreamix/internal/domain/platform"
	"github.com/google/uuid"
)

func TestPlatformResponseMasksSecrets(t *testing.T) {
	p := &platform.Platform{
		ID:           uuid.New(),
		UserID:       uuid.New(),
		Name:         "YouTube",
		PlatformType: "youtube",
		StreamKey:    "abc123secret",
	}

	response := platform.ToPlatformResponse(p)
	if response.StreamKey != "****cret" {
		t.Fatalf("expected masked stream key, got %q", response.StreamKey)
	}
	if response.RTMPURL == "" {
		t.Fatal("expected RTMP URL")
	}
	if strings.Contains(response.RTMPURL, p.StreamKey) {
		t.Fatalf("RTMP response must not contain raw stream key: %q", response.RTMPURL)
	}
}

func TestMaskStreamKey(t *testing.T) {
	cases := map[string]string{
		"":       "",
		"abc":    "****",
		"abcdef": "****cdef",
	}

	for raw, expected := range cases {
		if got := platform.MaskStreamKey(raw); got != expected {
			t.Fatalf("MaskStreamKey(%q) = %q, want %q", raw, got, expected)
		}
	}
}

func TestUpdatePlatformAllowsBlankStreamKey(t *testing.T) {
	dto := platform.UpdatePlatformDTO{
		Name:         "Twitch",
		PlatformType: "twitch",
		StreamKey:    "",
	}

	if err := dto.Validate(); err != nil {
		t.Fatalf("blank update stream key should keep the current key, got %v", err)
	}
}
