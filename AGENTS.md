# AGENTS.md

Operational guide for coding agents in `gostreamix`.

## Project Context
- Stack: Go 1.25, Fiber, Bun + SQLite, React + Vite + Tailwind + shadcn/ui, Zap, Dig.
- Purpose: streaming control panel + ffmpeg pipeline orchestration.
- Main app entrypoint: `main.go`.
- CLI entrypoint: `cmd/cli/main.go` (`--reset-password`).
- Architecture doc: `ARCHITECTURE.md`.

## Build and Run Commands
- Run app locally:
```bash
go run ./main.go
```
- Build all packages:
```bash
go build ./...
```
- Build single binary:
```bash
go build -o gostreamix ./main.go
```
- Run admin CLI:
```bash
go run ./cmd/cli --reset-password
```

## Docker and Make Commands
- Dev server with Docker (recommended in README):
```bash
docker-compose -f docker-compose.dev.yml up --build
```
- Make shortcuts:
```bash
make dev
make up
make down
make logs
make shell
make clean
make restart
```

## Frontend Commands (React + Vite)
- Install frontend deps:
```bash
npm install --prefix ./web
```
- Start Vite dev server:
```bash
npm run dev --prefix ./web
```
- Build frontend assets for embed.FS:
```bash
npm run build --prefix ./web
```
- Taskfile shortcuts (if `task` installed):
```bash
task web:build
task web:dev
```

## Lint and Static Analysis
- No repository `golangci-lint` config detected.
- Baseline static checks:
```bash
go vet ./...
```
- Format code before commit:
```bash
go fmt ./...
```

## Test Commands
- Run all tests:
```bash
go test ./...
```
- Run one package:
```bash
go test ./internal/domain/auth/test -v
```
- Run one test function:
```bash
go test ./internal/domain/auth/test -run TestAuthService_Authenticate -v
```
- Run one subtest:
```bash
go test ./internal/domain/auth/test -run 'TestAuthService_Authenticate/Authenticate_success' -v
```
- Re-run without cache:
```bash
go test ./internal/domain/platform/test -run TestPlatformHandler -count=1 -v
```

## Current Test Baseline Note
- `go test ./...` currently fails at `internal/domain/video/test/service_test.go`.
- Failure cause: test expects raw sentinel error, implementation returns wrapped error.
- For new work, run targeted package tests for touched areas and do not assume full suite is green.

## Code Organization Rules
- Keep domain logic under `internal/domain/<domain>`.
- Standard domain files: `handler.go`, `service.go`, `repository.go`, `model.go`, `dto.go`, `interfaces.go`.
- Keep infrastructure concerns under `internal/infrastructure/*`.
- Keep reusable helpers under `internal/shared/*`.
- Keep React frontend source under `web/*`.

## Go Style Guidelines
- Follow existing project conventions first; avoid style-only churn.
- Use lowercase package names and concise domain naming.
- Constructors use `NewX(...)`.
- Keep import groups as: stdlib, internal module, third-party.
- Let gofmt/go fmt handle import sorting and spacing.
- Prefer small focused functions and clear method names (`GetStreams`, `CreateSession`).

## Types and Data Modeling
- Use `uuid.UUID` for entity IDs (current repo standard).
- Keep persistence structs in domain `model.go`.
- Keep transport/request shapes in DTOs or local request structs.
- Put interfaces at boundaries (`interfaces.go`), concrete impls in service/repo files.

## Error Handling Conventions
- Wrap lower-level errors with context using `%w`.
- Example: `fmt.Errorf("create stream record: %w", err)`.
- Use sentinel errors (`ErrXxx`) for business conditions requiring `errors.Is` checks.
- In handlers, return proper HTTP status codes and avoid leaking internal error details.
- Log internals with Zap and return user-safe messages to clients.

## HTTP and Middleware Conventions
- Register routes in each domain handler via `Routes(app *fiber.App)`.
- UI endpoints generally render via `utils.Render(...)`.
- API endpoints generally return JSON with `c.JSON(...)` / `fiber.Map`.
- Parse IDs early (`uuid.Parse`) and fail fast on bad input.
- Preserve existing auth, CSRF, and rate-limit behavior in `internal/infrastructure/server/http.go`.

## Logging Conventions
- Use injected `*zap.Logger`; prefer structured fields.
- Include useful identifiers (`userID`, `streamID`, `ip`) in error/warn logs.
- Avoid introducing `fmt.Println` in request paths.

## Testing Conventions
- Test stack: Go `testing` + `stretchr/testify` (`assert`, `mock`).
- Use subtests with descriptive names.
- Mock service/repository interfaces for unit tests.
- Use in-memory SQLite for repository integration tests.
- For wrapped errors, assert with `errors.Is` or partial message checks, not strict equality.

## Generated File Policy
- Do not manually edit generated frontend build artifacts under `internal/infrastructure/frontend/build/*`.
- Edit frontend source in `web/src/*`, then rebuild with `npm run build --prefix ./web`.

## Cursor/Copilot Rules Status
- `.cursor/rules/`: not found.
- `.cursorrules`: not found.
- `.github/copilot-instructions.md`: not found.
- If these files appear later, incorporate them and treat them as priority instructions.

## Agent Checklist Before Finishing
- Keep edits minimal and aligned to domain boundaries.
- Rebuild frontend assets with `npm run build --prefix ./web` when `web/src/*` changes.
- Run tests for changed package(s) with `-run` when possible.
- Run `go vet ./...` and `go fmt ./...` for touched Go code.
