import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const config = await prisma.globalConfig.findFirst();
    if (config) {
      const updated = await prisma.globalConfig.update({
        where: { id: config.id },
        data: { riskLevel: 'AUTO_DETECT' },
      });
      console.log('Updated riskLevel to:', updated.riskLevel);
    } else {
      const created = await prisma.globalConfig.create({
        data: { riskLevel: 'AUTO_DETECT' },
      });
      console.log('Created config with riskLevel:', created.riskLevel);
    }
  } catch (err) {
    console.error('Error updating config:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
