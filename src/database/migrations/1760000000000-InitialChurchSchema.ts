import { MigrationInterface, QueryRunner } from 'typeorm';

/** Creates the initial relational schema for the SRS core modules. */
export class InitialChurchSchema1760000000000 implements MigrationInterface {
  name = 'InitialChurchSchema1760000000000';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "sermons_status_enum" AS ENUM ('draft', 'published', 'archived')`,
    );
    await queryRunner.query(
      `CREATE TYPE "church_events_status_enum" AS ENUM ('draft', 'published', 'archived')`,
    );
    await queryRunner.query(
      `CREATE TYPE "ministries_status_enum" AS ENUM ('draft', 'published', 'archived')`,
    );
    await queryRunner.query(
      `CREATE TABLE "admin_users" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "email" varchar(254) NOT NULL UNIQUE, "passwordHash" varchar(100) NOT NULL, "createdAt" timestamptz NOT NULL DEFAULT now())`,
    );
    await queryRunner.query(
      `CREATE TABLE "sermons" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "title" varchar(180) NOT NULL, "speaker" varchar(140) NOT NULL, "date" date NOT NULL, "scripture" varchar(300), "category" varchar(100) NOT NULL, "description" text, "audioUrl" text, "videoUrl" text, "status" "sermons_status_enum" NOT NULL DEFAULT 'draft', "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`,
    );
    await queryRunner.query(
      `CREATE TABLE "church_events" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "name" varchar(180) NOT NULL, "date" date NOT NULL, "time" time NOT NULL, "location" varchar(250) NOT NULL, "status" "church_events_status_enum" NOT NULL DEFAULT 'draft', "speaker" varchar(140), "flyerUrl" text, "registrationRequired" boolean NOT NULL DEFAULT false, "description" text, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`,
    );
    await queryRunner.query(
      `CREATE TABLE "ministries" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "name" varchar(160) NOT NULL, "slug" varchar(180) NOT NULL UNIQUE, "description" text NOT NULL, "leader" varchar(140), "imageUrl" text, "status" "ministries_status_enum" NOT NULL DEFAULT 'draft', "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now())`,
    );
    for (const table of [
      'contact_inquiries',
      'visitor_inquiries',
      'prayer_requests',
    ]) {
      await queryRunner.query(
        `CREATE TABLE "${table}" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "name" varchar(140) NOT NULL, "email" varchar(254) NOT NULL, "phone" varchar(40), "message" text NOT NULL, "status" varchar(20) NOT NULL DEFAULT 'new', "createdAt" timestamptz NOT NULL DEFAULT now())`,
      );
    }
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "event" varchar(80) NOT NULL, "actorId" varchar(36), "details" jsonb NOT NULL DEFAULT '{}', "createdAt" timestamptz NOT NULL DEFAULT now())`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_event_created" ON "audit_logs" ("event", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE TABLE "content_records" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "type" varchar(32) NOT NULL, "title" varchar(180) NOT NULL, "slug" varchar(200) NOT NULL, "description" text, "details" jsonb NOT NULL DEFAULT '{}', "published" boolean NOT NULL DEFAULT false, "publishedAt" timestamptz, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), UNIQUE ("type", "slug"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "visitor_submissions" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "type" varchar(16) NOT NULL, "name" varchar(140) NOT NULL, "email" varchar(254) NOT NULL, "phone" varchar(40), "message" text NOT NULL, "status" varchar NOT NULL DEFAULT 'new', "createdAt" timestamptz NOT NULL DEFAULT now())`,
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_audit_event_created"`);
    for (const table of [
      'visitor_submissions',
      'content_records',
      'audit_logs',
      'prayer_requests',
      'visitor_inquiries',
      'contact_inquiries',
      'ministries',
      'church_events',
      'sermons',
      'admin_users',
    ])
      await queryRunner.query(`DROP TABLE IF EXISTS "${table}"`);
    for (const type of [
      'ministries_status_enum',
      'church_events_status_enum',
      'sermons_status_enum',
    ])
      await queryRunner.query(`DROP TYPE IF EXISTS "${type}"`);
  }
}
