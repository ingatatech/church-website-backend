import 'dotenv/config';
import dataSource from '../datasource';

async function fixInquirySchema() {
  await dataSource.initialize();
  const runner = dataSource.createQueryRunner();
  try {
    await runner.connect();
    const tables = ['contact_inquiries', 'prayer_requests', 'visitor_inquiries'];
    for (const t of tables) {
      await runner.query(`ALTER TABLE "${t}" ADD COLUMN IF NOT EXISTS "reply" text;`);
      await runner.query(`ALTER TABLE "${t}" ADD COLUMN IF NOT EXISTS "repliedAt" timestamptz;`);
      console.log(`Updated table ${t} with reply and repliedAt columns.`);
    }
    console.log('Inquiry schema fix completed successfully.');
  } finally {
    await runner.release();
    await dataSource.destroy();
  }
}

fixInquirySchema().catch(err => {
  console.error(err);
  process.exit(1);
});
