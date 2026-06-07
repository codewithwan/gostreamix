package notification

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

func (s *service) sendDiscord(ctx context.Context, webhookURL, message string) error {
	p := parseMessage(message)
	var payload map[string]interface{}

	if p.HasFields {
		emoji, color, statusDisplay := statusEmoji(p.Status)
		title := emoji + " " + cleanHeader(p.Header)

		fields := []interface{}{}
		if p.Stream != "" {
			fields = append(fields, map[string]interface{}{"name": "STREAM", "value": p.Stream, "inline": true})
		}
		if p.Status != "" {
			fields = append(fields, map[string]interface{}{"name": "STATUS", "value": statusDisplay, "inline": true})
		}
		if p.Trigger != "" {
			fields = append(fields, map[string]interface{}{"name": "TRIGGER", "value": "```\n" + p.Trigger + "\n```", "inline": false})
		}
		if p.Detail != "" {
			fields = append(fields, map[string]interface{}{"name": "DETAIL", "value": p.Detail, "inline": false})
		}

		payload = map[string]interface{}{
			"embeds": []interface{}{
				map[string]interface{}{
					"title":     title,
					"color":     color,
					"fields":    fields,
					"footer":    map[string]interface{}{"text": "GoStreamix Studio"},
					"timestamp": time.Now().UTC().Format(time.RFC3339),
				},
			},
		}
	} else {
		payload = map[string]interface{}{
			"embeds": []interface{}{
				map[string]interface{}{
					"title":       "🔔 GoStreamix Notification",
					"description": message,
					"color":       5793010,
					"footer":      map[string]interface{}{"text": "GoStreamix Studio"},
					"timestamp":   time.Now().UTC().Format(time.RFC3339),
				},
			},
		}
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("discord json marshal: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, webhookURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("discord request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("discord send: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("discord returned status %d", resp.StatusCode)
	}
	return nil
}

func (s *service) sendTelegram(ctx context.Context, botToken, chatID, message string) error {
	endpoint := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", botToken)
	p := parseMessage(message)
	var text string

	if p.HasFields {
		emoji, _, _ := statusEmoji(p.Status)
		header := cleanHeader(p.Header)
		parts := []string{fmt.Sprintf("<b>[GoStreamix] %s %s</b>", emoji, header)}
		if p.Stream != "" {
			parts = append(parts, fmt.Sprintf("📺 <b>Stream</b>: <code>%s</code>", p.Stream))
		}
		if p.Trigger != "" {
			parts = append(parts, fmt.Sprintf("⚠️ <b>Trigger</b>: <code>%s</code>", p.Trigger))
		}
		if p.Detail != "" {
			parts = append(parts, fmt.Sprintf("ℹ️ <b>Detail</b>: %s", p.Detail))
		}
		ts := p.Time
		if ts == "" {
			ts = time.Now().Local().Format("2006-01-02 15:04:05 MST")
		}
		parts = append(parts, fmt.Sprintf("🕒 <b>Time</b>: %s", ts))
		text = strings.Join(parts, "\n")
	} else {
		text = fmt.Sprintf(
			"<b>🔔 GoStreamix Notification</b>\n\nℹ️ <b>Message:</b>\n<i>%s</i>\n\n⚡ <b>Status:</b> <code>Active</code>\n⚙️ <b>Service:</b> <code>GoStreamix Studio</code>\n📅 <b>Time:</b> <code>%s</code>",
			message, time.Now().Local().Format("2006-01-02 15:04:05 MST"),
		)
	}

	data := url.Values{}
	data.Set("chat_id", chatID)
	data.Set("text", text)
	data.Set("parse_mode", "HTML")

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(data.Encode()))
	if err != nil {
		return fmt.Errorf("telegram request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("telegram send: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("telegram returned status %d", resp.StatusCode)
	}
	return nil
}
