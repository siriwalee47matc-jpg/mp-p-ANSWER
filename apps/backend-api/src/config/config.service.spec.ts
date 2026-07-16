import { ConfigService } from './config.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ConfigService', () => {
  it('creates the safe AUTO_DETECT default when configuration is missing', async () => {
    const prisma = {
      globalConfig: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 1, riskLevel: 'AUTO_DETECT' }),
      },
    };
    const service = new ConfigService(prisma as unknown as PrismaService);

    await expect(service.getConfig()).resolves.toEqual({ id: 1, riskLevel: 'AUTO_DETECT' });
    expect(prisma.globalConfig.create).toHaveBeenCalledWith({ data: { riskLevel: 'AUTO_DETECT' } });
  });

  it('updates the existing global risk level', async () => {
    const prisma = {
      globalConfig: {
        findFirst: jest.fn().mockResolvedValue({ id: 4, riskLevel: 'AUTO_DETECT' }),
        update: jest.fn().mockResolvedValue({ id: 4, riskLevel: 'MANUAL' }),
      },
    };
    const service = new ConfigService(prisma as unknown as PrismaService);

    await expect(service.setRiskLevel('MANUAL')).resolves.toEqual({ id: 4, riskLevel: 'MANUAL' });
    expect(prisma.globalConfig.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { riskLevel: 'MANUAL' },
    });
  });
});
