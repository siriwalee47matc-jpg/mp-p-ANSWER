import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: any;
  let jwtService: any;

  beforeEach(async () => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('test-token'),
      verify: jest.fn(),
      signAsync: jest.fn().mockResolvedValue('test-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should reject registration if email exists', async () => {
    prismaService.user.findUnique.mockResolvedValue({ id: 1 });
    await expect(service.register({ email: 'test@example.com', name: 'Test', password: 'password', confirmPassword: 'password' }))
      .rejects.toThrow('อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ');
  });

  it('should create user and return token on register', async () => {
    prismaService.user.findUnique.mockResolvedValue(null);
    prismaService.user.create.mockResolvedValue({ id: 1, email: 'test@example.com', role: 'INSPECTOR', name: 'Test' });
    
    const result = await service.register({ email: 'test@example.com', name: 'Test', password: 'password', confirmPassword: 'password' });
    expect(result.token).toBe('test-token');
    expect(prismaService.user.create).toHaveBeenCalled();
  });

  it('should reject login with invalid credentials', async () => {
    prismaService.user.findUnique.mockResolvedValue(null);
    await expect(service.login('test@example.com', 'password'))
      .rejects.toThrow('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
  });
});
