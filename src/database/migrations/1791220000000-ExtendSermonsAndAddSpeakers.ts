import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendSermonsAndAddSpeakers1791220000000 implements MigrationInterface {
  name = 'ExtendSermonsAndAddSpeakers1791220000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "speakers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(180) NOT NULL,
        "slug" varchar(200) NOT NULL,
        "title" varchar(140),
        "bio" text,
        "photoUrl" text,
        "email" varchar(254),
        "phone" varchar(40),
        "socialLinks" jsonb NOT NULL DEFAULT '{}',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_speakers_slug" UNIQUE ("slug")
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "sermons" ADD COLUMN IF NOT EXISTS "slug" varchar(200)`,
    );
    await queryRunner.query(
      `ALTER TABLE "sermons" ADD COLUMN IF NOT EXISTS "speakerId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "sermons" ADD COLUMN IF NOT EXISTS "bibleBook" varchar(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "sermons" ADD COLUMN IF NOT EXISTS "series" varchar(150)`,
    );
    await queryRunner.query(
      `ALTER TABLE "sermons" ADD COLUMN IF NOT EXISTS "ministry" varchar(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "sermons" ADD COLUMN IF NOT EXISTS "service" varchar(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "sermons" ADD COLUMN IF NOT EXISTS "thumbnailUrl" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "sermons" ADD COLUMN IF NOT EXISTS "allowDownload" boolean NOT NULL DEFAULT true`,
    );

    // Populate slugs for any existing records where slug is null
    await queryRunner.query(`
      UPDATE "sermons"
      SET "slug" = LOWER(REGEXP_REPLACE(REGEXP_REPLACE("title", '[^a-zA-Z0-9]+', '-', 'g'), '^-|-$', '', 'g')) || '-' || SUBSTRING("id"::text FROM 1 FOR 8)
      WHERE "slug" IS NULL OR "slug" = ''
    `);

    // Ensure slug column is NOT NULL now and unique
    await queryRunner.query(
      `ALTER TABLE "sermons" ALTER COLUMN "slug" SET NOT NULL`,
    );

    const checkIndex = await queryRunner.query(`
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = 'IDX_sermons_slug'
    `);
    if (!checkIndex || checkIndex.length === 0) {
      await queryRunner.query(
        `CREATE UNIQUE INDEX "IDX_sermons_slug" ON "sermons" ("slug")`,
      );
    }

    const checkFk = await queryRunner.query(`
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'FK_sermons_speakerId'
    `);
    if (!checkFk || checkFk.length === 0) {
      await queryRunner.query(`
        ALTER TABLE "sermons"
        ADD CONSTRAINT "FK_sermons_speakerId"
        FOREIGN KEY ("speakerId") REFERENCES "speakers"("id")
        ON DELETE SET NULL
      `);
    }

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sermons_status_date" ON "sermons" ("status", "date")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sermons_status_date"`);
    await queryRunner.query(
      `ALTER TABLE "sermons" DROP CONSTRAINT IF EXISTS "FK_sermons_speakerId"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sermons_slug"`);
    await queryRunner.query(
      `ALTER TABLE "sermons" DROP COLUMN IF EXISTS "allowDownload"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sermons" DROP COLUMN IF EXISTS "thumbnailUrl"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sermons" DROP COLUMN IF EXISTS "service"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sermons" DROP COLUMN IF EXISTS "ministry"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sermons" DROP COLUMN IF EXISTS "series"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sermons" DROP COLUMN IF EXISTS "bibleBook"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sermons" DROP COLUMN IF EXISTS "speakerId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sermons" DROP COLUMN IF EXISTS "slug"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "speakers"`);
  }
}
