import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContactInquirySubject1791280000000 implements MigrationInterface {
  name = 'AddContactInquirySubject1791280000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "contact_inquiries" ADD "subject" varchar(180)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "contact_inquiries" DROP COLUMN "subject"',
    );
  }
}
