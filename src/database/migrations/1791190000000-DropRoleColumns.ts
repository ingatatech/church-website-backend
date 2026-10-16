import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropRoleColumns1791190000000 implements MigrationInterface {
  name = 'DropRoleColumns1791190000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "admin_users" DROP COLUMN IF EXISTS "role"`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "users" DROP COLUMN IF EXISTS "role"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "admin_users_role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum"`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "admin_users_role_enum" AS ENUM ('admin')`,
    );
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "admin_users" ADD COLUMN IF NOT EXISTS "role" "admin_users_role_enum" NOT NULL DEFAULT 'admin'`,
    );
    await queryRunner.query(`CREATE TYPE "users_role_enum" AS ENUM ('member')`);
    await queryRunner.query(
      `ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "role" "users_role_enum" NOT NULL DEFAULT 'member'`,
    );
  }
}
