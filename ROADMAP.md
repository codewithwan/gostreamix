# GoStreamix Roadmap

This document tracks the current product state, known gaps, and practical next features for making GoStreamix a serious self-hosted streaming control panel.

## Current Status

- Docker dev environment runs and passes health checks on `http://localhost:8080`.
- Backend test suite passes with `go test ./...`.
- Backend static checks pass with `go vet ./...`.
- Frontend production build passes with `npm run build` from `web/`.
- Setup, login, dashboard, videos, platforms, streams, stream editor, activity logs, and notification settings are implemented.
- FFmpeg is installed in the dev container and stream pipelines are launched from the Go backend.

## Implemented Features

- First-run setup flow.
- Cookie-based auth with short-lived JWT and refresh tokens.
- CSRF protection and rate limiting.
- Dashboard system stats and historical metrics.
- Activity logs for HTTP and FFmpeg events.
- Video upload, thumbnail generation, metadata probing, folder grouping, preview, and delete.
- Platform target management for YouTube, Twitch, Facebook, TikTok, and custom RTMP.
- Stream create/start/stop/delete.
- Stream program editor with video queue, target editing, bitrate, resolution, and live apply.
- WebSocket broadcast for system stats, stream status, stream progress, and stream logs.
- Notification settings for Discord webhook and Telegram bot/chat, including test send.
- Admin CLI for password reset.

## Verification Gaps

- Notification save/test has code and UI, but needs authenticated end-to-end testing with real or mock Discord/Telegram credentials.
- Stream start/stop should be tested with a real uploaded video and a safe RTMP test endpoint.
- Upload flow should be tested with large files, unsupported files, duplicate names, and interrupted uploads.
- Stream editor queue currently saves multiple video IDs, but the running pipeline starts from the first video only. True playlist playback is not implemented yet.
- Dashboard stats endpoints work, but CPU stats can take about one second per request.
- Frontend bundle is large enough to trigger Vite chunk-size warning.
- Old docs contain outdated references and mojibake text.

## Priority TODO

### P0 - Make Local Testing Reliable

- [ ] Reset or document the local admin password for development.
- [ ] Add a simple smoke-test checklist for setup, login, upload, platform, stream, notification settings, and logout.
- [ ] Add a mock notification endpoint option so Discord/Telegram test sends can be verified without external services.
- [ ] Add a safe local RTMP test target or documented test container for stream validation.

### P1 - Streaming Correctness

- [ ] Implement true playlist streaming for `StreamProgram.VideoIDs`, not only the first video.
- [ ] Persist runtime stream status or reconcile it after app restart.
- [ ] Validate RTMP targets before starting FFmpeg.
- [ ] Validate resolution, bitrate, and FPS server-side.
- [ ] Improve FFmpeg stop handling and wait for process exit deterministically.
- [ ] Add stream service and FFmpeg builder tests.

### P1 - Media Reliability

- [ ] Enforce upload size limits.
- [ ] Validate uploaded file MIME and extension.
- [ ] Handle ffprobe/thumbnail failures with visible UI warnings.
- [ ] Add upload progress in the frontend.
- [ ] Prevent deleting a video that is used by an active stream unless forced.

### P1 - Settings And Notifications

- [ ] Validate Discord webhook URL format before saving.
- [ ] Validate Telegram token/chat ID shape before saving.
- [ ] Mask secrets consistently in API responses or split read/write DTOs.
- [ ] Add tests for notification repository and service.
- [ ] Add stream event notifications for started, stopped, failed, and recovered.

### P2 - Product Polish

- [ ] Code-split frontend routes to reduce the main JS bundle.
- [ ] Improve mobile layout for stream editor and media grid.
- [ ] Add empty states with clear actions for first-time users.
- [ ] Add confirmation dialogs instead of `window.confirm`.
- [ ] Add user-facing error details for common FFmpeg failures.
- [ ] Clean up mojibake text in old docs and CLI output.

### P2 - Operations

- [ ] Add production deployment guide.
- [ ] Add backup and restore docs for SQLite, uploads, thumbnails, and app key.
- [ ] Add Docker health and log troubleshooting docs.
- [ ] Add version/build metadata endpoint.
- [ ] Add structured audit log export.

## Feature Ideas

- Playlist scheduling with start time, end time, repeat mode, and gap handling.
- Multi-output stream profiles per platform.
- Stream preview page with current video, elapsed time, queue, and target health.
- Per-platform status checks and reconnect attempts.
- Webhook notification templates.
- Stream presets for 720p, 1080p, vertical 9:16, and low-bandwidth mode.
- File browser with tags, search, sorting, and duration filters.
- Bulk video upload with progress and retry.
- User roles for admin/operator/viewer.
- API token support for automation.
- Import/export settings for migration between servers.
- Lightweight onboarding wizard: upload video, add platform, create stream, start.

