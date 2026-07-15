package stream

import "testing"

func TestCleanRTMPTargets(t *testing.T) {
	t.Run("accepts valid rtmp and rtmps targets", func(t *testing.T) {
		got, err := cleanRTMPTargets([]string{
			"rtmp://a.rtmp.youtube.com/live2/key-123",
			"rtmps://live.twitch.tv/app/sk_test",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(got) != 2 {
			t.Fatalf("expected 2 targets, got %d", len(got))
		}
	})

	t.Run("rejects tee-injection via pipe", func(t *testing.T) {
		_, err := cleanRTMPTargets([]string{"rtmp://ok.example/live|[f=flv]/tmp/pwn.flv"})
		if err == nil {
			t.Fatal("expected tee-injection target to be rejected")
		}
	})

	t.Run("rejects option-bracket and whitespace injection", func(t *testing.T) {
		for _, bad := range []string{
			"rtmp://ok.example/[f=flv]x",
			"rtmp://ok.example/live key",
			"rtmp://ok.example/live\n[f=flv]/tmp/x",
		} {
			if _, err := cleanRTMPTargets([]string{bad}); err == nil {
				t.Fatalf("expected %q to be rejected", bad)
			}
		}
	})

	t.Run("rejects non-rtmp scheme", func(t *testing.T) {
		if _, err := cleanRTMPTargets([]string{"http://evil.example/x"}); err == nil {
			t.Fatal("expected non-rtmp scheme to be rejected")
		}
	})
}
