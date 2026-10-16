import 'dotenv/config';
import dataSource from '../datasource';
import { seedSeventhDayContent } from '../seeds/seventh-day-content';

const confirmationPhrase = 'REPLACE_NEON_PUBLIC_CONTENT_AND_RESEED';

function assertNeonProductionResetWasExplicitlyRequested() {
  if (process.env.NODE_ENV !== 'production') {
    throw new Error('Refusing reset: NODE_ENV must be production.');
  }
  if (process.env.RESET_TARGET !== 'neon-production') {
    throw new Error('Refusing reset: RESET_TARGET must be neon-production.');
  }
  if (process.env.RESET_NEON_PUBLIC_CONTENT !== confirmationPhrase) {
    throw new Error(
      `Refusing reset: set RESET_NEON_PUBLIC_CONTENT=${confirmationPhrase} explicitly.`,
    );
  }
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_DB) {
    throw new Error('Refusing reset: no PostgreSQL database is configured.');
  }

  const host = process.env.DATABASE_URL
    ? new URL(process.env.DATABASE_URL).hostname
    : (process.env.POSTGRES_HOST ?? 'localhost');
  if (!host.toLowerCase().endsWith('.neon.tech')) {
    throw new Error(
      'Refusing reset: the configured database host is not a Neon host.',
    );
  }
}

async function replaceNeonPublicContent() {
  assertNeonProductionResetWasExplicitlyRequested();
  await dataSource.initialize();

  const runner = dataSource.createQueryRunner();
  try {
    await runner.connect();
    await runner.startTransaction();
    await runner.query('SELECT pg_advisory_xact_lock(1760160000000)');

    const contentTables = [
      'content_records',
      'ministries',
      'church_events',
      'sermons',
      'speakers',
    ];
    for (const table of contentTables) {
      const exists = await runner.query(
        'SELECT to_regclass($1) IS NOT NULL AS exists',
        [`public.${table}`],
      );
      if (!exists[0]?.exists) {
        throw new Error(`Expected public content table is missing: ${table}`);
      }
    }

    const deletedCounts: Record<string, number> = {};
    for (const table of [
      'sermons',
      'church_events',
      'content_records',
      'ministries',
      'speakers',
    ]) {
      const deleted = await runner.query(
        `DELETE FROM public."${table}" RETURNING id`,
      );
      deletedCounts[table] = deleted.length;
    }
    await seedSeventhDayContent(runner.manager);
    await runner.commitTransaction();

    console.log(
      `Replaced public content on Neon production: ${JSON.stringify(deletedCounts)}. Accounts, inquiries, submissions, audit records, outbox data, schema, and migration history were preserved.`,
    );
  } catch (error) {
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    throw error;
  } finally {
    await runner.release();
    await dataSource.destroy();
  }
}

replaceNeonPublicContent().catch((error: unknown) => {
  console.error('Neon public content replacement failed:', error);
  process.exitCode = 1;
});
