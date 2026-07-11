import { Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  private hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `scrypt$${salt}$${hash}`;
  }

  private verifyPassword(password: string, passwordHash: string): boolean {
    const [algorithm, salt, storedHash] = passwordHash.split('$');
    if (algorithm === 'scrypt' && salt && storedHash) {
      const calculatedHash = crypto.scryptSync(password, salt, 64);
      return crypto.timingSafeEqual(calculatedHash, Buffer.from(storedHash, 'hex'));
    }

    // Supports development data created before the production password upgrade.
    const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(legacyHash), Buffer.from(passwordHash));
  }

  async onModuleInit() {
    const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
    const name = process.env.INITIAL_ADMIN_NAME?.trim();
    const password = process.env.INITIAL_ADMIN_PASSWORD;

    if (!email && !name && !password) return;
    if (!email || !name || !password) {
      throw new Error('INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_NAME and INITIAL_ADMIN_PASSWORD must be provided together.');
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) return;

    await this.prisma.user.create({
      data: { email, name, role: 'ADMIN', passwordHash: this.hashPassword(password) },
    });
    this.logger.log(`Initial administrator created for ${email}. Remove INITIAL_ADMIN_PASSWORD now.`);
  }

  async login(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    if (!this.verifyPassword(pass, user.passwordHash)) {
      throw new UnauthorizedException('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }

    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    return {
      token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}
