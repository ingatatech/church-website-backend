# Church Website Management API

NestJS and TypeORM backend for the church website. It provides public church content and visitor services, together with authenticated administration for content, users, and media.

| Resource | Link |
| --- | --- |
| Source repository | [github.com/ingatatech/church-website-backend](https://github.com/ingatatech/church-website-backend) |
| Deployed API documentation | [church-website-backend-92xx.onrender.com/api/docs](https://church-website-backend-92xx.onrender.com/api/docs) |

## Technology

- NestJS 11 and TypeScript
- PostgreSQL with TypeORM and versioned migrations
- JWT authentication and role-based administrator access
- Swagger / OpenAPI documentation
- Cloudinary media storage
- pnpm for package management

## Project structure

```text
src/
|-- main.ts                  # App bootstrap, middleware, /api prefix, validation, Swagger
|-- app/
|   |-- app.module.ts        # Root module and shared infrastructure wiring
|   `-- modules/             # HTTP feature modules
|       |-- admin/           # Admin overview endpoints
|       |-- audit/           # Audit events and logs
|       |-- auth/            # Registration, login, JWT, password and Google auth
|       |-- content/         # CMS records, FAQs, and announcements
|       |-- events/          # Church events
|       |-- health/          # API and database health check
|       |-- inquiries/       # Contact, visitor, and prayer requests
|       |-- ministries/      # Ministry records
|       |-- sermons/         # Sermons and speakers
|       |-- submissions/     # Public form submissions
|       `-- users/           # User and administrator management
|-- database/
|   |-- config/              # Environment validation
|   |-- migrations/          # PostgreSQL schema changes
|   |-- scripts/             # Operational database scripts
|   |-- seeds/               # Initial admin and website content
|   `-- datasource.ts        # TypeORM CLI data source
|-- helpers/                 # HTTP filters, interceptors, decorators, responses
|-- libs/                    # Shared cache, i18n, JWT, OTP, events, queue, storage
`-- utils/                   # Shared utilities, constants, enums, transformers

test/                        # Jest unit/e2e tests and test configuration
uploads/                     # Local static/legacy upload directory
var/mail/                    # Development email output when using file transport
```

Feature modules generally keep their controllers, services, DTOs, and database entities together. Controllers define HTTP routes, services hold business logic, DTOs validate incoming data, and TypeORM entities map application data to PostgreSQL. Cross-cutting behavior and shared services live in `helpers/` and `libs/`.

## API overview

The API base path is `/api`. Browse the deployed [interactive OpenAPI documentation](https://church-website-backend-92xx.onrender.com/api/docs) for request schemas, response formats, and the complete route list. The local Swagger UI is available at `http://localhost:5004/api/docs` when using the example port.

Main route groups include:

| Route group | Purpose |
| --- | --- |
| `/api/auth` | Account registration and verification, login, password recovery, and authentication |
| `/api/content` | Public published content and CMS content management |
| `/api/sermons`, `/api/events`, `/api/ministries` | Public church information and administrator management |
| `/api/inquiries`, `/api/submissions` | Contact, visitor, prayer, and other public form submissions |
| `/api/admin` | Administrator summaries and management endpoints |
| `/api/admin/users` | User and role administration |
| `/api/media` | Media library and Cloudinary uploads |
| `/api/audit` | Administrator audit history |
| `/api/health` | API and database health status |

Administrative endpoints require an authenticated active administrator. Public registration creates member accounts; create the first administrator using the bootstrap settings and seed command below.

## Run locally

### Prerequisites

- Node.js and pnpm (the package manifest specifies pnpm `11.1.3`)
- PostgreSQL
- A Cloudinary account for media uploads

### Install and configure

Run these commands from the repository root:

```sh
pnpm install
copy .env.example .env
```

On macOS/Linux, use `cp .env.example .env` instead of `copy`.

Edit `.env` for your local environment. The example file documents the supported variables, including:

- `APP_PORT` and `CORS_ORIGINS` for the HTTP server and browser origins
- `DATABASE_URL` or the individual `POSTGRES_*` settings, plus `DATABASE_SSL_CONNECTION`
- `JWT_SECRET` and `JWT_EXPIRES_IN`
- `CLOUDINARY_URL` and optional `CLOUDINARY_DELIVERY_HOST`
- `MAIL_TRANSPORT`, `MAIL_DIRECTORY`, `MAIL_FROM`, and `SMTP_URL`
- `ADMIN_EMAIL` and `ADMIN_INITIAL_PASSWORD`

Use your own secure values; do not commit `.env` or use example credentials in a deployed environment. `DATABASE_URL`, when set, takes precedence over the individual PostgreSQL connection settings.

### Prepare the database and start

Create the configured PostgreSQL database, then apply migrations and create the initial administrator:

```sh
pnpm migration:run
pnpm seed:admin
pnpm start:dev
```

The example `.env` uses port `5004`. Set a `JWT_SECRET` of at least 32 characters and an `ADMIN_INITIAL_PASSWORD` of at least 12 characters. TypeORM schema synchronization is disabled; schema changes are made through migrations. Startup migrations are opt-in with `TYPEORM_MIGRATIONS_RUN=true`.

### Email and media notes

- The example uses `MAIL_TRANSPORT=file` for local development. Messages are written to `var/mail/`. For production, configure SMTP using `MAIL_TRANSPORT=smtp`, `MAIL_FROM`, and `SMTP_URL`; keep credentials in environment settings or a secret manager.
- Media uploads are sent to Cloudinary and require `CLOUDINARY_URL`. New uploads are not saved to the local `uploads/` directory. `MEDIA_UPLOAD_DIR` configures the directory used to serve local/legacy files under `/uploads`.
- Verification codes, pending registrations, password-reset state, refresh tokens, and domain events use in-process memory. These are not shared across instances and are cleared on restart, so deployments that rely on these flows should run a single API instance.

## Useful commands

| Command | Description |
| --- | --- |
| `pnpm start:dev` | Run the API in watch mode |
| `pnpm build` | Compile the application |
| `pnpm start:prod` | Run the compiled application from `dist/` |
| `pnpm test` | Run unit tests |
| `pnpm test:e2e` | Run end-to-end tests |
| `pnpm test:cov` | Run tests with coverage |
| `pnpm migration:run` | Apply pending database migrations |
| `pnpm migration:revert` | Revert the latest migration |
| `pnpm seed:admin` | Create or promote the configured initial administrator |
| `pnpm seed:homepage` | Seed sample homepage content |
| `pnpm seed:website-settings` | Fill missing website settings |

## Database and content

Migration files are in `src/database/migrations/`; the TypeORM CLI uses `src/database/datasource.ts`. Review and apply migrations when updating the database schema.

The CMS stores reusable content in a shared content-record table, with a content type and structured details. Seeds in `src/database/seeds/` provide initial administrator and website content. Avoid running sample/demo content seeds against production unless that is intentional.

## Tests and CI

Jest test files are colocated with feature code or stored under `test/`. Run `pnpm test` for unit tests and `pnpm test:e2e` for the end-to-end suite. GitHub Actions builds the project; deployment is managed separately.
