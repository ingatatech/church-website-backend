import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendChurchEventDetails1791210000000 implements MigrationInterface {
  name = 'ExtendChurchEventDetails1791210000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "church_events" ADD COLUMN IF NOT EXISTS "endTime" time`,
    );
    await queryRunner.query(
      `ALTER TABLE "church_events" ADD COLUMN IF NOT EXISTS "organizer" varchar(180)`,
    );
    await queryRunner.query(
      `ALTER TABLE "church_events" ADD COLUMN IF NOT EXISTS "registrationInfo" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "church_events" ADD COLUMN IF NOT EXISTS "contactInfo" varchar(254)`,
    );
    await queryRunner.query(
      `ALTER TABLE "church_events" ADD COLUMN IF NOT EXISTS "mapUrl" text`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "church_events" DROP COLUMN "mapUrl"`);
    await queryRunner.query(
      `ALTER TABLE "church_events" DROP COLUMN "contactInfo"`,
    );
    await queryRunner.query(
      `ALTER TABLE "church_events" DROP COLUMN "registrationInfo"`,
    );
    await queryRunner.query(
      `ALTER TABLE "church_events" DROP COLUMN "organizer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "church_events" DROP COLUMN "endTime"`,
    );
  }
}
