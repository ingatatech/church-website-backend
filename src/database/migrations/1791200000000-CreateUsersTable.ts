import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1791200000000 implements MigrationInterface {
  name = 'CreateUsersTable1791200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "users_status_enum" AS ENUM ('pending', 'active', 'disabled')`,
    );
    await queryRunner.query(
      `CREATE TYPE "users_provider_enum" AS ENUM ('local', 'google')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar(254) NOT NULL UNIQUE,
        "fullName" varchar(140) NOT NULL,
        "password" varchar(100),
        "phone" varchar(40),
        "avatar" text,
        "status" "users_status_enum" NOT NULL DEFAULT 'pending',
        "provider" "users_provider_enum" NOT NULL DEFAULT 'local',
        "emailVerified" boolean NOT NULL DEFAULT false,
        "lastLogin" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_provider_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_status_enum"`);
  }
}
