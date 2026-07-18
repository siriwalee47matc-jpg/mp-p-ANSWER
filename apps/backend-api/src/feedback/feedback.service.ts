import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { rating: number; comment?: string; userAgent?: string }) {
    if (data.rating < 1 || data.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }
    return this.prisma.feedback.create({
      data: {
        rating: data.rating,
        comment: data.comment?.trim() || null,
        userAgent: data.userAgent || null,
      },
    });
  }

  async findAll() {
    const [items, total, avgResult] = await Promise.all([
      this.prisma.feedback.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.feedback.count(),
      this.prisma.feedback.aggregate({ _avg: { rating: true } }),
    ]);

    return {
      total,
      averageRating: avgResult._avg.rating
        ? Math.round(avgResult._avg.rating * 10) / 10
        : null,
      items,
    };
  }
}
