import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMediaAssets1791260000000 implements MigrationInterface {
  name = 'CreateMediaAssets1791260000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "media_assets" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "resourceType" varchar(16) NOT NULL,
        "publicId" varchar(512) NOT NULL,
        "secureUrl" text NOT NULL,
        "format" varchar(32),
        "width" integer,
        "height" integer,
        "bytes" bigint NOT NULL,
        "altText" text NOT NULL DEFAULT '',
        "folder" varchar(255) NOT NULL,
        "cloudinaryCreatedAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_media_asset_resource_public_id" UNIQUE ("resourceType", "publicId")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_media_assets_created_at" ON "media_assets" ("cloudinaryCreatedAt" DESC)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_media_assets_created_at"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "media_assets"`);
  }
}
