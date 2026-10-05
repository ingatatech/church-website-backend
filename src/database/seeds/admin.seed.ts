import * as bcrypt from 'bcrypt';
import dataSource from '../datasource';
import { AdminUser } from '../../app/modules/auth/entities/admin-user.entity';

async function seedAdmin() {
  await dataSource.initialize();
  try {
    const admins = dataSource.getRepository(AdminUser);
    const email = 'admin@church.org';
    const existing = await admins.findOneBy({ email });
    if (existing) {
      console.log(`Initial admin already exists (${email}); no changes made.`);
      return;
    }
    const initialPassword = process.env.ADMIN_INITIAL_PASSWORD;
    if (!initialPassword || initialPassword.length < 12)
      throw new Error(
        'Set ADMIN_INITIAL_PASSWORD to a value with at least 12 characters before running the admin seeder',
      );
    const passwordHash = await bcrypt.hash(initialPassword, 12);
    await admins.save(admins.create({ email, passwordHash }));
    console.log(`Initial admin created (${email}).`);
  } finally {
    await dataSource.destroy();
  }
}
seedAdmin().catch((error: unknown) => {
  console.error('Admin seeding failed:', error);
  process.exitCode = 1;
});
