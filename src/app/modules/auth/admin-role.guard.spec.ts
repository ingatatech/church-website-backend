import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole, UserStatus } from '../../../utils/enums';
import { AdminRoleGuard } from './admin-role.guard';

describe('AdminRoleGuard', () => {
  const guard = new AdminRoleGuard();

  function contextFor(user?: { role?: UserRole; status?: UserStatus }) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as ExecutionContext;
  }

  it('allows an active administrator', () => {
    expect(
      guard.canActivate(
        contextFor({ role: UserRole.admin, status: UserStatus.active }),
      ),
    ).toBe(true);
  });

  it.each([
    [undefined, 'an unauthenticated request'],
    [{ role: UserRole.member, status: UserStatus.active }, 'a member'],
    [
      { role: UserRole.admin, status: UserStatus.disabled },
      'a disabled administrator',
    ],
    [
      { role: UserRole.admin, status: UserStatus.pending },
      'a pending administrator',
    ],
  ])('rejects %s', (user) => {
    expect(() => guard.canActivate(contextFor(user))).toThrow(
      ForbiddenException,
    );
  });
});
