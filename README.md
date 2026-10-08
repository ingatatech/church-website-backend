# Church Website Management API

NestJS and TypeORM backend for the church website SRS. It provides administrator JWT authentication, sermons, events, ministries, public inquiries and their administration, audit logs, media upload, and reusable church content (pages, services, announcements, resources, FAQs, leaders, and testimonials).

## Run locally

1. Create a local PostgreSQL database and configure `.env` from `.env.example`. Keep `.env` out of version control.
2. Start Redis locally (host and port are configurable; the API still starts if Redis is temporarily unreachable).
3. Install dependencies with `pnpm install`.
4. Start the API with `pnpm start:dev`.

The service reads PostgreSQL, JWT, Redis, and Cloudinary settings from `.env`. Set `CLOUDINARY_URL` to the private Cloudinary API environment URL for authenticated media uploads; the API secret must stay on the server. Uploads are stored in the `church-website` Cloudinary folder, with images, audio/video, and PDFs routed to the matching Cloudinary resource type. TypeORM schema synchronization is enabled outside production for local development; production deployments should apply reviewed migrations with `pnpm migration:run` and keep `TYPEORM_MIGRATIONS_RUN=false` unless automatic startup migrations are intentionally desired. `DATABASE_URL` can specify a complete connection string or individual `POSTGRES_*` fields can be used. SSL is disabled for local PostgreSQL when `DATABASE_SSL_CONNECTION=false`.

Set a strong `JWT_SECRET` (at least 32 characters) and `ADMIN_INITIAL_PASSWORD` (at least 12 characters), then create the first administrator with `pnpm seed:admin`. The seed creates `admin@church.org` only if that account does not exist and stores a bcrypt hash. Do not use example values in a deployed environment.

## Continuous integration

GitHub Actions builds every pushed branch. Non-`main` branches are built together with the current `main` branch to catch integration errors. The workflow does not create or merge pull requests and does not deploy; review, merge, and deployment remain explicit operations.

## API

Base path: `/api`. Interactive OpenAPI documentation: `/api/docs`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/content/:type` | List published records with `page` and `limit` pagination |
| GET | `/api/content/:type/:slug` | Read one published record |
| POST | `/api/content` | Create a CMS content record (send `x-admin-api-key`) |
| PATCH | `/api/content/:id` | Update a CMS content record (send `x-admin-api-key`) |
| DELETE | `/api/content/:id` | Delete a CMS content record (send `x-admin-api-key`) |
| GET | `/api/admin/announcements` | JWT-protected announcement management list with category, status, and search filters |
| GET | `/api/admin/announcements/:id` | JWT-protected announcement detail for administration |
| POST / PATCH | `/api/admin/announcements` and `/api/admin/announcements/:id` | JWT-protected announcement create and update |
| POST | `/api/admin/announcements/:id/:action` | JWT-protected publish, schedule, unpublish, or archive action |
| GET | `/api/content/announcements` | List only currently public announcements; optionally filter by controlled category |
| GET | `/api/content/announcements/:slug` | Read one currently public announcement |
| POST | `/api/submissions` | Submit `contact`, `prayer`, or `visitor` message |
| POST | `/api/auth/login` | Administrator login, returns JWT |
| GET | `/api/auth/profile` | Get current administrator profile (Bearer token) |
| GET / POST / PATCH / DELETE | `/api/sermons` | Public published sermon reads; JWT required for writes |
| GET / POST / PATCH / DELETE | `/api/events` | Public published event reads; JWT required for writes |
| GET / POST / PATCH / DELETE | `/api/ministries` | Public published ministry reads; JWT required for writes |
| POST | `/api/inquiries/contact`, `/visitor`, `/prayer` | Public inquiry intake |
| GET / PATCH | `/api/inquiries/:type` | JWT protected inquiry management |
| GET | `/api/audit` | JWT protected audit event history |
| POST | `/api/media/upload` | JWT protected Cloudinary media upload (15 MB limit) |

Successful responses use `{ success, data, timestamp }` (existing content endpoints also include a message); errors use `{ success: false, statusCode, error, timestamp }`. CMS writes require a JWT Bearer token. Submissions should be handled as private information, especially prayer requests.

## Architecture notes

HTTP controllers, services, DTOs, and TypeORM entities live in feature modules under `src/app`. Inquiry, authentication, sermon, and event domain changes publish Redis messages; the audit subscriber writes selected event metadata to PostgreSQL. Inquiry events contain only a record ID and type, never contact details or prayer text. Shared response and exception formatting live under `src/helpers`.

Content records use a shared `content_records` table with a typed content category and JSONB `details` for SRS-specific attributes. Announcement lifecycle, category, image, publication date, and expiry date are validated by the content service; public announcement queries enforce visibility dates in the database query. New media uploads are stored in Cloudinary. Existing local media files remain available under `/uploads/`; configure `MEDIA_UPLOAD_DIR` to point to a different legacy media directory.
