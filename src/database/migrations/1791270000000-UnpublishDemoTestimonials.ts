import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UnpublishDemoTestimonials1791270000000
  implements MigrationInterface
{
  name = 'UnpublishDemoTestimonials1791270000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "content_records"
      SET "published" = false,
          "details" = COALESCE("details", '{}'::jsonb) || '{"consentApproved": false}'::jsonb,
          "updatedAt" = now()
      WHERE "type" = 'testimonials'
        AND "slug" IN ('amina-n', 'samuel-k', 'grace-m')
    `);
  }

  async down(): Promise<void> {
    // Do not republish fabricated demo testimonials or restore assumed consent.
  }
}
