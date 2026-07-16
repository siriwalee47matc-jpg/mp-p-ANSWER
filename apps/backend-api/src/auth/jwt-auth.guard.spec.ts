import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

function contextWithAuthorization(authorization?: string) {
  const request = { headers: { authorization } } as any;
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
  return { context, request };
}

describe('JwtAuthGuard', () => {
  it('rejects requests without a bearer token', async () => {
    const guard = new JwtAuthGuard({ verifyAsync: jest.fn() } as unknown as JwtService);
    const { context } = contextWithAuthorization();
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('attaches a verified user payload to the request', async () => {
    const payload = { id: 7, role: 'ADMIN' };
    const jwtService = { verifyAsync: jest.fn().mockResolvedValue(payload) };
    const guard = new JwtAuthGuard(jwtService as unknown as JwtService);
    const { context, request } = contextWithAuthorization('Bearer valid-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
      secret: process.env.JWT_SECRET,
    });
    expect(request.user).toEqual(payload);
  });

  it('rejects invalid or expired tokens', async () => {
    const jwtService = { verifyAsync: jest.fn().mockRejectedValue(new Error('expired')) };
    const guard = new JwtAuthGuard(jwtService as unknown as JwtService);
    const { context } = contextWithAuthorization('Bearer expired-token');
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
