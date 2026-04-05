# Shared Utilities

This directory contains shared utilities, error classes, and helpers used across the application.

## Included

- **errors/** — Generic error classes (`ConfigurationParsingError`, `InvalidCredentialsError`, `ForbiddenActionError`, `UniqueConstraintError`)
- **utils/** — Hash utilities (bcrypt password hashing and comparison)

## Excluded from original project

The following items were excluded during template extraction as they are domain-specific:

- `RedirectNotFoundError` — specific to the redirects domain
- `repository.types.ts` (`type Id = number`) — only used by the redirects domain
- `job.service.ts` — generic interval job scheduler; add back if needed for background tasks

## Adding domain-specific shared utilities

Place your domain-specific shared utilities, error classes, and helpers here. Follow the existing patterns:

- Error classes extend `Error` and go in `errors/`
- Utility functions go in `utils/`
- Re-export everything through the barrel `index.ts` files

