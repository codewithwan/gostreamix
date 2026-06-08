# Contributing to GoStreamix

Thanks for helping improve GoStreamix. This project is an MVP that already runs end to end, so contributions should keep the app practical, stable, and easy to self-host.

## Before You Start

Please check the current README, open issues, and recent commits before starting a larger change. For small fixes, documentation updates, and focused tests, feel free to open a pull request directly.

For bigger changes, open an issue first when the work affects:

- Stream lifecycle behavior.
- Video storage or file paths.
- Authentication, authorization, sessions, or cookies.
- Database schema or migrations.
- Public API contracts.
- Docker images or deployment defaults.
- UI navigation and core workflows.

## Development Setup

Recommended Docker workflow:

```bash
docker compose -f docker-compose.dev.yml up --build
```

Manual local workflow:

```bash
npm install --prefix ./web
npm run build --prefix ./web
go run main.go
```

Frontend-only workflow:

```bash
npm run dev --prefix ./web
```

The app runs at:

```text
http://localhost:8080
```

## Required Checks

Before opening a pull request, run the checks that match your change.

Backend:

```bash
go test ./...
```

Frontend:

```bash
npm test --prefix ./web
npm run build --prefix ./web
```

Docker changes:

```bash
docker compose -f docker-compose.dev.yml up --build
docker compose up --build
```

If a check cannot be run, mention why in the pull request.

## Code Style

Backend guidelines:

- Keep domain logic inside the matching `internal/domain/*` package.
- Keep infrastructure details inside `internal/infrastructure/*`.
- Prefer small services and handlers over large cross-domain functions.
- Use existing validation, error, repository, and handler patterns.
- Run `gofmt` on changed Go files.
- Add or update Go tests for service, handler, repository, and validation changes.

Frontend guidelines:

- Follow the existing React feature-folder structure under `web/src/features`.
- Use the `@/` alias for imports from `web/src`.
- Keep shared UI primitives in `web/src/components/ui`.
- Keep page-level orchestration in `web/src/pages`.
- Add utility tests for non-trivial formatting, mapping, validation, and state helpers.
- Preserve responsive behavior and the English/Indonesian i18n pattern when adding user-facing copy.

Documentation guidelines:

- Keep commands copy-pasteable.
- Document required environment variables and runtime dependencies.
- Update README when setup, deployment, features, or user workflows change.
- Avoid documenting behavior that is not implemented yet.

## Commit Style

Use concise conventional commits:

```text
feat: add stream scheduling controls
fix: handle missing video thumbnails
test: cover platform target validation
docs: improve Docker setup guide
chore: update frontend dependencies
refactor: split stream program helpers
```

Keep commits focused. A pull request can contain multiple commits when each commit tells a useful part of the story.

## Pull Request Checklist

Before requesting review:

- The app builds or the failing check is explained.
- Relevant tests are added or updated.
- README or CONTRIBUTING is updated when behavior changes.
- New configuration has safe defaults and is documented.
- No local secrets, database files, uploads, thumbnails, logs, or generated runtime data are committed.
- Screenshots or short notes are included for visible UI changes.

## Security

Do not open a public issue for sensitive vulnerabilities. If you find a security issue, contact the maintainer privately first.

Security-sensitive areas include:

- Auth setup and login.
- JWT signing and cookie behavior.
- Upload validation and file serving.
- Stream keys and RTMP targets.
- Webhook URLs and notification tokens.
- Proxy headers and deployment trust boundaries.

## License

By contributing, you agree that your contributions are licensed under the MIT License used by this repository.
