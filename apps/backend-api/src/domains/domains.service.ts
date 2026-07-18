import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DomainsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.blockedDomain.findMany({
      orderBy: { blockedAt: 'desc' },
    });
  }

  async create(dto: { domain: string; reason: string; addedByUserId?: number }) {
    const cleanDomain = dto.domain.trim().toLowerCase().replace('www.', '');

    const existing = await this.prisma.blockedDomain.findUnique({
      where: { domain: cleanDomain },
    });

    if (existing) {
      throw new ConflictException(`โดเมน ${cleanDomain} ถูกระงับการเข้าถึงอยู่แล้วในระบบ`);
    }

    return this.prisma.blockedDomain.create({
      data: {
        domain: cleanDomain,
        reason: dto.reason,
        addedByUserId: dto.addedByUserId || null,
      },
    });
  }

  async remove(id: number) {
    const existing = await this.prisma.blockedDomain.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`ไม่พบไอดีโดเมนที่ระบุ ${id}`);
    }

    return this.prisma.blockedDomain.delete({
      where: { id },
    });
  }
}
