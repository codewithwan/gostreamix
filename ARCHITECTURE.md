# Project Architecture

Gostreamix follows a domain-driven architectural pattern with clear separation of concerns.

## Directory Structure

- `cmd/`: Application entry points.
  - `cli/`: Command-line tool for administrative tasks (e.g., password reset).
- `internal/`: Private application code.
  - `domain/`: Business logic and entities grouped by domain (auth, platform, stream, video).
    - Each domain typically contains:
      - `handler.go`: HTTP handlers.
      - `service.go`: Business logic layer.
      - `repository.go`: Database abstraction.
      - `model.go`: Domain entities/database models.
      - `dto.go`: Data Transfer Objects for requests.
      - `interfaces.go`: Service and Repository interface definitions.
      - `test/`: Unit and integration tests.
  - `infrastructure/`: External dependencies and setup (database, server, logger, config).
  - `shared/`: Utilities and middlewares used across multiple domains.
  - `ui/`: Frontend components and pages using Templ.
- `assets/`: Static files (images, css, js).
- `data/`: Local storage for SQLite, uploads, and thumbnails.

## Core Technologies

- **Web Framework**: [Fiber](https://gofiber.io/) (v2)
- **Templating**: [Templ](https://templ.guide/)
- **ORM**: [Bun](https://bun.uptrace.dev/)
- **Database**: SQLite3
- **Styling**: Tailwind CSS
- **Interactivity**: HTMX
- **Logging**: Zap
- **Dependency Injection**: [dig](https://github.com/uber-go/dig)

## Design Patterns

- **Dependency Injection**: Use `uber-go/dig` to manage dependencies and promote loose coupling.
- **Repository Pattern**: Abstract database operations to allow for easier testing and swapping of database backends.
- **Service Layer**: Contain business logic and orchestrate between repositories and handlers.
- **DTOs**: Use dedicated structures for request/response payloads to avoid exposing domain models directly.
- **Middleware-based Handlers**: Use Fiber middlewares for authentication, internationalization, and logging.
