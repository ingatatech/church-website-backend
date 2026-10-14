import * as bcrypt from 'bcrypt';
import dataSource from '../datasource';
import { AuthProvider, UserRole, UserStatus } from '../../utils/enums';
import { User } from '../../app/modules/users/entities/user.entity';

async function seedAdmin() {
  await dataSource.initialize();
  const runner = dataSource.createQueryRunner();
  try {
    await runner.connect();
    await runner.startTransaction();
    await runner.query('SELECT pg_advisory_xact_lock(1791240000000)');

    const users = runner.manager.getRepository(User);
    const existingAdmin = await users.findOneBy({ role: UserRole.admin });
    if (existingAdmin) {
      console.log(
        `An administrator already exists (${existingAdmin.email}); no changes made.`,
      );
      await runner.commitTransaction();
      return;
    }

    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const initialPassword = process.env.ADMIN_INITIAL_PASSWORD;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Set ADMIN_EMAIL to the initial administrator email');
    }
    if (!initialPassword || initialPassword.length < 12) {
      throw new Error(
        'Set ADMIN_INITIAL_PASSWORD to a value with at least 12 characters before running the administrator seeder',
      );
    }

    const existingUser = await users.findOneBy({ email });
    if (existingUser?.status === UserStatus.disabled) {
      throw new Error(
        'The configured initial administrator account is disabled; enable it before running the seeder',
      );
    }

    const passwordHash = await bcrypt.hash(initialPassword, 12);
    const administrator =
      existingUser ??
      users.create({
        email,
        fullName: process.env.ADMIN_FULL_NAME?.trim() || 'Church Administrator',
        provider: AuthProvider.local,
        emailVerified: true,
        status: UserStatus.active,
      });
    administrator.role = UserRole.admin;
    if (!administrator.password) administrator.password = passwordHash;
    if (administrator.status === UserStatus.pending) {
      administrator.status = UserStatus.active;
      administrator.emailVerified = true;
    }

    await users.save(administrator);
    await runner.commitTransaction();
    console.log(`Initial administrator created (${email}).`);
  } catch (error) {
    if (runner.isTransactionActive) await runner.rollbackTransaction();
    throw error;
  } finally {
    await runner.release();
    await dataSource.destroy();
  }
}

seedAdmin().catch((error: unknown) => {
  console.error('Administrator seeding failed:', error);
  process.exitCode = 1;
});
