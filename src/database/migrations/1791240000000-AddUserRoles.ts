import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserRoles1791240000000 implements MigrationInterface {
  name = 'AddUserRoles1791240000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "users_role_enum" AS ENUM ('member', 'admin')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "role" "users_role_enum" NOT NULL DEFAULT 'member'`,
    );
    await queryRunner.query(
      `INSERT INTO "users" ("email", "fullName", "password", "status", "provider", "emailVerified", "role")
       SELECT LOWER(admin."email"), 'Church Administrator', admin."passwordHash",
              'active', 'local', true, 'admin'
       FROM "admin_users" admin
       ON CONFLICT ("email") DO UPDATE
       SET "role" = 'admin',
           "password" = COALESCE("users"."password", EXCLUDED."password"),
           "emailVerified" = true`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
    await queryRunner.query(`DROP TYPE "users_role_enum"`);
  }
}
