import dataSource from '../datasource';
import { UserRole, UserStatus } from '../../utils/enums';
import { User } from '../../app/modules/users/entities/user.entity';

async function grantAdmin() {
  const targetEmail = process.argv[2]?.trim().toLowerCase();

  await dataSource.initialize();
  const usersRepo = dataSource.getRepository(User);

  if (!targetEmail) {
    console.log('\n--- Church Portal Administrator Management ---');
    console.log('Usage: pnpm run make:admin <email>');
    console.log('Example: pnpm run make:admin pastor@example.com\n');

    const currentAdmins = await usersRepo.findBy({ role: UserRole.admin });
    if (currentAdmins.length === 0) {
      console.log('Currently, there are no administrator accounts in the database.');
    } else {
      console.log(`Current Administrators (${currentAdmins.length}):`);
      for (const admin of currentAdmins) {
        console.log(` - ${admin.fullName} (${admin.email}) [Status: ${admin.status}]`);
      }
    }
    await dataSource.destroy();
    return;
  }

  const user = await usersRepo.findOneBy({ email: targetEmail });
  if (!user) {
    console.error(`\n[ERROR] No account found with email: "${targetEmail}"`);
    console.log('Please make sure the user has registered at /admin/signup or /signup first.\n');
    await dataSource.destroy();
    process.exitCode = 1;
    return;
  }

  user.role = UserRole.admin;
  user.status = UserStatus.active;
  user.emailVerified = true;
  await usersRepo.save(user);

  console.log(`\n[SUCCESS] Administrator access granted to:`);
  console.log(` - Name:   ${user.fullName}`);
  console.log(` - Email:  ${user.email}`);
  console.log(` - Role:   ${user.role}`);
  console.log(` - Status: ${user.status}`);
  console.log(`\nThe user can now log in at /admin/login with full administrator access.\n`);

  await dataSource.destroy();
}

grantAdmin().catch((err: unknown) => {
  console.error('\nFailed to update user role:', err);
  process.exitCode = 1;
});
