# Church Website Management API

NestJS and TypeORM backend for the church website SRS. It provides administrator JWT authentication, sermons, events, ministries, public inquiries and their administration, audit logs, media upload, and reusable church content (pages, services, announcements, resources, FAQs, leaders, and testimonials).

## Run locally

1. Create a local PostgreSQL database and configure `.env` from `.env.example`. Keep `.env` out of version control.
2. Start Redis locally (host and port are configurable; the API still starts if Redis is temporarily unreachable).
3. Install dependencies with `pnpm install`.
4. Start the API with `pnpm start:dev`.

Seed website settings with `pnpm seed:website-settings`. This fills missing church location/map details and adds hidden demo social links without replacing existing settings. Replace the sample social URLs with the church's official profiles in Admin â†’ Settings before making them visible. `pnpm seed:homepage` seeds the full demo site content.

The service reads PostgreSQL, JWT, Redis, Cloudinary, and mail settings from `.env`. Registration verification emails are queued in the PostgreSQL outbox and retried when delivery fails. In local development, `MAIL_TRANSPORT=file` writes `.eml` messages to `var/mail`; set `MAIL_TRANSPORT=smtp`, `MAIL_FROM`, and `SMTP_URL` to send real email. URL-encode special characters in SMTP credentials. Keep SMTP credentials in the environment or a secret manager, not in source control. `CLOUDINARY_URL` is required and must contain the private Cloudinary API credentials; the API secret stays on the server. All media uploads are sent by the backend to the `church-website` Cloudinary folder, with images, audio/video, and PDFs routed to the matching Cloudinary resource type. Uploads fail if Cloudinary is unavailable; files are never saved to local disk. Image URL validation accepts Cloudinary shared and private CDN URLs. If your Cloudinary account returns URLs from a custom delivery hostname, set `CLOUDINARY_DELIVERY_HOST` in the backend and `NEXT_PUBLIC_CLOUDINARY_DELIVERY_HOST` in the frontend to that hostname. TypeORM schema synchronization is disabled; apply the outbox and application migrations with `pnpm migration:run` or enable startup migrations explicitly with `TYPEORM_MIGRATIONS_RUN=true`. Production must set `MAIL_TRANSPORT=smtp`, `MAIL_FROM`, and `SMTP_URL`. `DATABASE_URL` can specify a complete connection string or individual `POSTGRES_*` fields can be used. SSL is disabled for local PostgreSQL when `DATABASE_SSL_CONNECTION=false`.

Set a strong `JWT_SECRET` (at least 32 characters), `ADMIN_EMAIL`, and `ADMIN_INITIAL_PASSWORD` (at least 12 characters). Apply the database migrations first, then create the first administrator with `pnpm seed:admin`. The seed creates or promotes the explicitly configured account only when no administrator exists, and stores the initial password as a bcrypt hash. Existing legacy administrator accounts are migrated into the user table as administrators. New self-registered accounts always receive the `member` role. Do not use example values in a deployed environment.

## Continuous integration

GitHub Actions builds every pushed branch. Non-`main` branches are built together with the current `main` branch to catch integration errors. The workflow does not create or merge pull requests and does not deploy; review, merge, and deployment remain explicit operations.

## API

Base path: `/api`. Interactive OpenAPI documentation: `/api/docs`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/content/:type` | List published records with `page` and `limit` pagination |
| GET | `/api/content/:type/:slug` | Read one published record |
| POST | `/api/content` | Create a CMS content record (active administrator role required) |
| PATCH | `/api/content/:id` | Update a CMS content record (active administrator role required) |
| DELETE | `/api/content/:id` | Delete a CMS content record (active administrator role required) |
| GET | `/api/admin/announcements` | Active administrator role required; supports category, status, and search filters |
| GET | `/api/admin/announcements/:id` | Active administrator role required |
| POST / PATCH | `/api/admin/announcements` and `/api/admin/announcements/:id` | Active administrator role required |
| POST | `/api/admin/announcements/:id/:action` | Active administrator role required for publish, schedule, unpublish, or archive |
| GET | `/api/content/announcements` | List only currently public announcements; optionally filter by controlled category |
| GET | `/api/content/announcements/:slug` | Read one currently public announcement |
| POST | `/api/submissions` | Submit `contact`, `prayer`, or `visitor` message |
| POST | `/api/auth/login` | Administrator login, returns JWT |
| GET | `/api/auth/profile` | Get current administrator profile (Bearer token) |
| GET / POST / PATCH / DELETE | `/api/sermons` | Public published sermon reads; active administrator role required for writes |
| GET / POST / PATCH / DELETE | `/api/events` | Public published event reads; active administrator role required for writes |
| GET / POST / PATCH / DELETE | `/api/ministries` | Public published ministry reads; active administrator role required for writes |
| POST | `/api/inquiries/contact`, `/visitor`, `/prayer` | Public inquiry intake |
| GET / PATCH | `/api/inquiries/:type` | Active administrator role required for inquiry management |
| GET | `/api/audit` | Active administrator role required for audit event history |
| POST | `/api/media/upload` | Active administrator role required for Cloudinary media upload (15 MB image limit) |

Successful responses use `{ success, data, timestamp }` (existing content endpoints also include a message); errors use `{ success: false, statusCode, error, timestamp }`. CMS writes require a JWT Bearer token. Submissions should be handled as private information, especially prayer requests.

All administrative APIs require a valid JWT for an active user whose database role is `admin`. The role is looked up from PostgreSQL for each request, so changes take effect without waiting for token expiry. Public registration always creates `member` accounts; create the initial administrator explicitly with `ADMIN_EMAIL`, `ADMIN_INITIAL_PASSWORD`, and `pnpm seed:admin`.

## Architecture notes

HTTP controllers, services, DTOs, and TypeORM entities live in feature modules under `src/app`. Inquiry, authentication, sermon, and event domain changes publish Redis messages; the audit subscriber writes selected event metadata to PostgreSQL. Inquiry events contain only a record ID and type, never contact details or prayer text. Shared response and exception formatting live under `src/helpers`.

Content records use a shared `content_records` table with a typed content category and JSONB `details` for SRS-specific attributes. Announcement lifecycle, category, image, publication date, and expiry date are validated by the content service; public announcement queries enforce visibility dates in the database query. New media uploads are stored in Cloudinary. Existing local media files remain available under `/uploads/`; configure `MEDIA_UPLOAD_DIR` to point to a different legacy media directory.
