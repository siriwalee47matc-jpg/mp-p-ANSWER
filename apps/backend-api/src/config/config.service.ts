import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ConfigService {
  constructor(private prisma: PrismaService) {}

  /** Get global config (auto-create if not exists) */
  async getConfig() {
    let config = await this.prisma.globalConfig.findFirst();
    if (!config) {
      config = await this.prisma.globalConfig.create({
        data: { riskLevel: 'AUTO_DETECT' },
      });
    }
    return config;
  }

  /** Update global risk level */
  async setRiskLevel(riskLevel: string) {
    const config = await this.getConfig();
    return this.prisma.globalConfig.update({
      where: { id: config.id },
      data: { riskLevel },
    });
  }
}
