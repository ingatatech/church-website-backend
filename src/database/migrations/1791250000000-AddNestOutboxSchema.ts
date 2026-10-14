import { PostgresOutboxStore } from '@nestjs/outbox/postgres';
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNestOutboxSchema1791250000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(PostgresOutboxStore.migrationSql());
  }

  async down(): Promise<void> {
    // Outbox migrations are additive and intentionally have no down migration.
  }
}
