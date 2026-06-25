import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AllowlistService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.domainAllowlist.findMany({
      orderBy: [{ listType: 'asc' }, { domain: 'asc' }],
    });
  }

  async findMatchingDomain(domain: string) {
    const cleanDomain = this.normalizeDomain(domain);
    const entries = await this.prisma.domainAllowlist.findMany();
    return (
      entries.find((entry) => cleanDomain === entry.domain || cleanDomain.endsWith(`.${entry.domain}`)) || null
    );
  }

  async create(dto: {
    domain: string;
    listType: string;
    action: string;
    reason: string;
    notes?: string;
  }) {
    const domain = this.normalizeDomain(dto.domain);
    const existing = await this.prisma.domainAllowlist.findUnique({ where: { domain } });
    if (existing) {
      throw new ConflictException(`Allowlist entry already exists for ${domain}`);
    }

    return this.prisma.domainAllowlist.create({
      data: {
        domain,
        listType: dto.listType,
        action: dto.action,
        reason: dto.reason,
        notes: dto.notes || null,
      },
    });
  }

  async remove(id: number) {
    const existing = await this.prisma.domainAllowlist.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Allowlist entry ${id} not found`);
    }

    return this.prisma.domainAllowlist.delete({ where: { id } });
  }

  private normalizeDomain(domain: string) {
    return domain.trim().toLowerCase().replace(/^www\./, '');
  }
}
