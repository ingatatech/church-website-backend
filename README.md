# Church Website Management API

NestJS and TypeORM backend for the church website SRS. The initial API covers reusable church content (pages, ministries, services, events, sermons, announcements, resources, FAQs, leaders, and testimonials) and public contact, prayer, and visitor submissions.

## Run locally

1. Create a PostgreSQL database locally and configure `.env` from `.env.example`. Keep `.env` out of version control.
2. Install dependencies with `npm install`.
3. Start the API with `npm run start:dev`.

The service reads `APP_PORT` and PostgreSQL settings from `.env`. TypeORM schema synchronization is enabled outside production to support local development; use reviewed migrations in production. `DATABASE_URL` can specify a complete connection string or the individual `POSTGRES_*` fields can be used. SSL is disabled for the local database when `DATABASE_SSL_CONNECTION=false`.

## API

Base path: `/api`. Interactive OpenAPI documentation: `/api/docs`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/content/:type` | List published records with `page` and `limit` pagination |
| GET | `/api/content/:type/:slug` | Read one published record |
| POST | `/api/content` | Create a CMS content record (send `x-admin-api-key`) |
| PATCH | `/api/content/:id` | Update a CMS content record (send `x-admin-api-key`) |
| DELETE | `/api/content/:id` | Delete a CMS content record (send `x-admin-api-key`) |
| POST | `/api/submissions` | Submit `contact`, `prayer`, or `visitor` message |

Successful responses use `{ success, statusCode, message, data }`; errors use `{ success: false, statusCode, message }`. CMS writes require a configured `ADMIN_API_KEY` using the `x-admin-api-key` header. Submissions should be handled as private information, especially prayer requests.

## Architecture notes

HTTP controllers and DTO validation live in feature modules under `src/app/modules`. Services own persistence and publish domain events (`content.created`, `content.updated`, `content.deleted`, and `submission.created`) through Nest's in-process event emitter. TypeORM entities define persistence models; shared response and exception formatting live under `src/helpers`. The event emitter is in-process pub/sub for decoupling application features; use a durable broker if events must survive restarts or cross process boundaries.

Content records use a shared `content_records` table with a typed content category and JSONB `details` for SRS-specific attributes such as speaker/scripture/media links, venue, event dates, or leader role. Visitor submissions use a separate `visitor_submissions` table.
