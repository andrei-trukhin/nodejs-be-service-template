# Express Backend Template

A production-ready Node.js + Express backend template with JWT authentication, user management, API tokens, and Prisma ORM.

## Features

- **JWT Authentication** — Login, logout, refresh token rotation with reuse detection
- **User Management** — CRUD operations, password changes, role-based access
- **API Tokens** — Long-lived scoped tokens for programmatic access
- **Role & Scope Middleware** — Fine-grained endpoint protection
- **Health Check** — Simple and detailed health endpoints
- **Configuration** — Type-safe environment parsing with validation
- **Logger** — Leveled console logger with named prefixes
- **Error Handling** — Layered error mapping (domain → HTTP errors → JSON responses)
- **Prisma ORM** — PostgreSQL with type-safe queries and migrations
- **Docker** — Multi-stage production Dockerfile

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your values (especially DATABASE_URL, JWT_SECRET, TOKEN_HASH_PEPPER)
```

### 3. Generate Prisma client

```bash
npx prisma generate
```

### 4. Run database migrations

```bash
npx prisma migrate dev
```

### 5. Start development server

```bash
npm run dev
```

The server will start at `http://0.0.0.0:8080` by default.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production (rollup) |
| `npm start` | Start production server |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run Prisma migrations (dev) |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run db:deploy` | Deploy migrations + generate (production) |

## Architecture

```
src/
├── server.ts                  # Entry point
├── bootstrap/                 # Application bootstrapping (DI wiring)
│   ├── index.ts               # Orchestrator: config → infra → services → routes → app
│   ├── bootstrap-infrastructure.ts  # Database + repositories
│   ├── bootstrap-services.ts        # Business services
│   ├── bootstrap-routes.ts          # Route registration
│   └── bootstap-app.ts             # Express app setup (CORS, middleware, error handlers)
├── config/                    # Type-safe configuration classes
├── api/                       # HTTP layer
│   ├── shared/                # Reusable HTTP errors, handlers, middlewares
│   └── v1/                    # Versioned route controllers
│       ├── auth/              # Login, logout, refresh
│       ├── users/             # User CRUD + role management
│       ├── api-tokens/        # API token management
│       └── health/            # Health check endpoints
├── domains/                   # Business logic (clean architecture)
│   ├── authentication/        # Auth services, JWT, refresh tokens, API tokens
│   └── users/                 # User entity, service, repository
├── dtos/                      # Data transfer objects
├── shared/                    # Cross-cutting: errors, utilities
└── logger/                    # Logger interface + console implementation
```

### Bootstrap Sequence

1. **Configuration** — Parses and validates environment variables
2. **Infrastructure** — Creates database connection, instantiates repositories
3. **Services** — Wires business services with repositories and config
4. **Routes** — Creates route controllers with service dependencies
5. **App** — Builds the Express application with middleware and mounts routes

### Adding a New Domain Module

1. Create `src/domains/your-domain/` with `entities/`, `repositories/`, `services/`, `infrastructure/`, `errors/`
2. Add repository instantiation in `bootstrap/bootstrap-infrastructure.ts`
3. Add service instantiation in `bootstrap/bootstrap-services.ts`
4. Create a router in `src/api/v1/your-domain/`
5. Register the router in `bootstrap/bootstrap-routes.ts`
6. Add domain errors to `api/shared/handlers/error-mapper.handler.ts`

## API Endpoints

### Auth (`/api/v1/auth`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/login` | Login with username/password |
| POST | `/logout` | Logout (invalidate refresh token) |
| POST | `/refresh` | Refresh JWT + rotate refresh token |

### Users (`/api/v1/users`) — Requires JWT + ADMIN role
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List all users |
| POST | `/` | Create a new user |
| PATCH | `/password` | Change own password |
| DELETE | `/:id` | Delete a user |
| PATCH | `/:id/role` | Update a user's role |

### API Tokens (`/api/v1/api-tokens`) — Requires JWT + ADMIN role
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List own API tokens |
| POST | `/` | Create a new API token |
| DELETE | `/:id` | Revoke an API token |

### Health (`/health`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Simple UP status |
| GET | `/ready` | Detailed status with uptime and version |

## License

ISC

