import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DOWNLOAD_CLICKS = 'download_clicks';
const EXTENSION_INSTALLS = 'extension_installs';

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicMetrics() {
    const metrics = await this.prisma.platformMetric.findMany({
      where: { key: { in: [DOWNLOAD_CLICKS, EXTENSION_INSTALLS] } },
    });
    const values = new Map(metrics.map((metric) => [metric.key, metric.value]));

    return {
      downloadClicks: values.get(DOWNLOAD_CLICKS) ?? 0,
      extensionInstalls: values.get(EXTENSION_INSTALLS) ?? 0,
    };
  }

  async recordDownloadClick() {
    const metric = await this.prisma.platformMetric.upsert({
      where: { key: DOWNLOAD_CLICKS },
      create: { key: DOWNLOAD_CLICKS, value: 1 },
      update: { value: { increment: 1 } },
    });

    return { downloadClicks: metric.value };
  }

  async recordExtensionInstall(installationId: string, version?: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.extensionInstall.findUnique({ where: { id: installationId } });
      if (existing) {
        await tx.extensionInstall.update({
          where: { id: installationId },
          data: { version: version || existing.version },
        });
        return { counted: false };
      }

      await tx.extensionInstall.create({ data: { id: installationId, version } });
      const metric = await tx.platformMetric.upsert({
        where: { key: EXTENSION_INSTALLS },
        create: { key: EXTENSION_INSTALLS, value: 1 },
        update: { value: { increment: 1 } },
      });

      return { counted: true, extensionInstalls: metric.value };
    });
  }
}
