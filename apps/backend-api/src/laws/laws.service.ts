import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LawsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.lawRule.findMany({
      orderBy: { section: 'asc' },
    });
  }
}
