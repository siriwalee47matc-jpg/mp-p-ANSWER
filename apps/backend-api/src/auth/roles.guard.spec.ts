import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@kp-ads/shared';
import { RolesGuard } from './roles.guard';

function roleContext(role?: UserRole) {
  return {
    getHandler: () => roleContext,
    getClass: () => RolesGuard,
    switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows routes without role metadata', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) };
    expect(new RolesGuard(reflector as unknown as Reflector).canActivate(roleContext())).toBe(true);
  });

  it('allows a user with an accepted role', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]) };
    expect(new RolesGuard(reflector as unknown as Reflector).canActivate(roleContext(UserRole.ADMIN))).toBe(true);
  });

  it('rejects missing or disallowed roles', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]) };
    const guard = new RolesGuard(reflector as unknown as Reflector);
    expect(() => guard.canActivate(roleContext())).toThrow(ForbiddenException);
    expect(() => guard.canActivate(roleContext(UserRole.INSPECTOR))).toThrow(ForbiddenException);
  });
});
