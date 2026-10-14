import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendMinistryDetails1791230000000 implements MigrationInterface {
  name = 'ExtendMinistryDetails1791230000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "ministries" ADD COLUMN IF NOT EXISTS "targetAudience" varchar(180)`);
    await queryRunner.query(`ALTER TABLE "ministries" ADD COLUMN IF NOT EXISTS "meetingSchedule" varchar(300)`);
    await queryRunner.query(`ALTER TABLE "ministries" ADD COLUMN IF NOT EXISTS "location" varchar(250)`);
    await queryRunner.query(`ALTER TABLE "ministries" ADD COLUMN IF NOT EXISTS "contactEmail" varchar(254)`);
    await queryRunner.query(`ALTER TABLE "ministries" ADD COLUMN IF NOT EXISTS "contactPhone" varchar(40)`);
    await queryRunner.query(`ALTER TABLE "ministries" ADD COLUMN IF NOT EXISTS "ctaLabel" varchar(80)`);
    await queryRunner.query(`ALTER TABLE "ministries" ADD COLUMN IF NOT EXISTS "ctaUrl" varchar(500)`);
    await queryRunner.query(`ALTER TABLE "ministries" ADD COLUMN IF NOT EXISTS "seoTitle" varchar(180)`);
    await queryRunner.query(`ALTER TABLE "ministries" ADD COLUMN IF NOT EXISTS "seoDescription" varchar(300)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "ministries" DROP COLUMN IF EXISTS "seoDescription"`);
    await queryRunner.query(`ALTER TABLE "ministries" DROP COLUMN IF EXISTS "seoTitle"`);
    await queryRunner.query(`ALTER TABLE "ministries" DROP COLUMN IF EXISTS "ctaUrl"`);
    await queryRunner.query(`ALTER TABLE "ministries" DROP COLUMN IF EXISTS "ctaLabel"`);
    await queryRunner.query(`ALTER TABLE "ministries" DROP COLUMN IF EXISTS "contactPhone"`);
    await queryRunner.query(`ALTER TABLE "ministries" DROP COLUMN IF EXISTS "contactEmail"`);
    await queryRunner.query(`ALTER TABLE "ministries" DROP COLUMN IF EXISTS "location"`);
    await queryRunner.query(`ALTER TABLE "ministries" DROP COLUMN IF EXISTS "meetingSchedule"`);
    await queryRunner.query(`ALTER TABLE "ministries" DROP COLUMN IF EXISTS "targetAudience"`);
  }
}
