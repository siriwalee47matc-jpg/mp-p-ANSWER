import { MetricsService } from './metrics.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MetricsService', () => {
  it('returns zero defaults for missing public metrics', async () => {
    const prisma = { platformMetric: { findMany: jest.fn().mockResolvedValue([]) } };
    const service = new MetricsService(prisma as unknown as PrismaService);
    await expect(service.getPublicMetrics()).resolves.toEqual({ downloadClicks: 0, extensionInstalls: 0 });
  });

  it('increments download clicks atomically', async () => {
    const prisma = { platformMetric: { upsert: jest.fn().mockResolvedValue({ value: 15 }) } };
    const service = new MetricsService(prisma as unknown as PrismaService);
    await expect(service.recordDownloadClick()).resolves.toEqual({ downloadClicks: 15 });
    expect(prisma.platformMetric.upsert).toHaveBeenCalledWith({
      where: { key: 'download_clicks' },
      create: { key: 'download_clicks', value: 1 },
      update: { value: { increment: 1 } },
    });
  });

  it('does not count an existing extension installation twice', async () => {
    const tx = {
      extensionInstall: {
        findUnique: jest.fn().mockResolvedValue({ id: 'install-1', version: '1.0.3' }),
        update: jest.fn().mockResolvedValue({}),
      },
      platformMetric: { upsert: jest.fn() },
    };
    const prisma = { $transaction: jest.fn((callback) => callback(tx)) };
    const service = new MetricsService(prisma as unknown as PrismaService);

    await expect(service.recordExtensionInstall('install-1', '1.0.4')).resolves.toEqual({ counted: false });
    expect(tx.extensionInstall.update).toHaveBeenCalled();
    expect(tx.platformMetric.upsert).not.toHaveBeenCalled();
  });
});
