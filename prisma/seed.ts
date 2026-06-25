import { PrismaClient } from '@prisma/client';
import { UserRole, CaseStatus, ProductType } from '@kp-ads/shared';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('Starting seeding...');

  // 1. Clean existing data
  await prisma.auditLog.deleteMany({});
  await prisma.case.deleteMany({});
  await prisma.lawRule.deleteMany({});
  await prisma.blockedDomain.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Cleaned database.');

  // 2. Create Users
  const passwordHash = hashPassword('password123');

  const admin = await prisma.user.create({
    data: {
      email: 'admin@fda.go.th',
      name: 'ผู้ดูแลระบบสูงสุด',
      role: UserRole.ADMIN,
      passwordHash,
    },
  });

  const inspector = await prisma.user.create({
    data: {
      email: 'inspector@fda.go.th',
      name: 'สมชาย ตรวจสืบ',
      role: UserRole.INSPECTOR,
      passwordHash,
    },
  });

  const reviewer = await prisma.user.create({
    data: {
      email: 'reviewer@fda.go.th',
      name: 'สมศรี ผู้ทบทวน',
      role: UserRole.REVIEWER,
      passwordHash,
    },
  });

  const legal = await prisma.user.create({
    data: {
      email: 'legal@fda.go.th',
      name: 'วิชัย นิติมั่นคง',
      role: UserRole.LEGAL_OFFICER,
      passwordHash,
    },
  });

  const executive = await prisma.user.create({
    data: {
      email: 'executive@fda.go.th',
      name: 'นพ. มานพ ผู้บริหาร',
      role: UserRole.EXECUTIVE,
      passwordHash,
    },
  });

  console.log('Seeded users.');

  // 3. Create Law Rules
  const law40 = await prisma.lawRule.create({
    data: {
      section: 'มาตรา 40',
      lawName: 'พ.ร.บ. อาหาร พ.ศ. 2522',
      description: 'ห้ามมิให้ผู้ใดโฆษณาคุณประโยชน์ คุณภาพ หรือสรรพคุณของอาหารอันเป็นเท็จหรือเป็นการหลอกลวงให้เกิดความหลงเชื่อโดยไม่สมควร',
      riskLevel: 'HIGH',
    },
  });

  const law41 = await prisma.lawRule.create({
    data: {
      section: 'มาตรา 41',
      lawName: 'พ.ร.บ. อาหาร พ.ศ. 2522',
      description: 'ผู้ใดประสงค์จะโฆษณาคุณประโยชน์ คุณภาพ หรือสรรพคุณของอาหารเพื่อประโยชน์ในทางการค้า ต้องนำรายละเอียดเกี่ยวกับการแสดงคุณประโยชน์ คุณภาพ หรือสรรพคุณดังกล่าว... ไปขออนุญาตต่อผู้อนุญาตก่อน',
      riskLevel: 'MEDIUM',
    },
  });

  const law113 = await prisma.lawRule.create({
    data: {
      section: 'มาตรา 113',
      lawName: 'พ.ร.บ. ยา พ.ศ. 2510',
      description: 'ห้ามมิให้ผู้ใดโฆษณาขายยาโดยแสดงสรรพคุณยาว่าสามารถบำบัด บรรเทา รักษา หรือป้องกันโรคหรืออาการของโรคที่รัฐมนตรีประกาศ... หรือโฆษณาขายยาอันเป็นเท็จหรือเกินความจริง',
      riskLevel: 'HIGH',
    },
  });

  const lawCosmetic = await prisma.lawRule.create({
    data: {
      section: 'มาตรา 41 (เครื่องสำอาง)',
      lawName: 'พ.ร.บ. เครื่องสำอาง พ.ศ. 2558',
      description: 'การโฆษณาเครื่องสำอางต้องไม่ใช้ข้อความที่ไม่เป็นธรรมต่อผู้บริโภคหรือใช้ข้อความที่อาจก่อให้เกิดผลเสียต่อสังคมเป็นส่วนรวม หรือใช้ข้อความที่เป็นเท็จหรือเกินความจริง',
      riskLevel: 'MEDIUM',
    },
  });

  console.log('Seeded law rules.');

  // 4. Create Blocked Domains
  await prisma.blockedDomain.createMany({
    data: [
      {
        domain: 'fake-slimming-pills.com',
        reason: 'โฆษณาผลิตภัณฑ์ลดน้ำหนักโอ้อวดสรรพคุณเกินจริงและตรวจพบสารอันตราย',
        addedByUserId: admin.id,
      },
      {
        domain: 'cancer-cure-miracle.net',
        reason: 'โฆษณาขายยาสมุนไพรรักษามะเร็งหายขาดโดยไม่มีใบอนุญาตและเข้าข่ายหลอกลวง',
        addedByUserId: admin.id,
      },
    ],
  });

  console.log('Seeded blocked domains.');

  // 5. Create Sample Cases
  await prisma.case.create({
    data: {
      id: 'CASE-2026-001',
      title: 'ชากุหลาบวิเศษ คุมหิว ลด 10 กิโลใน 3 วัน สลายไขมันด่วน',
      url: 'http://fake-slimming-pills.com/slimming-tea',
      domain: 'fake-slimming-pills.com',
      productType: ProductType.FOOD,
      productLicenseNumber: '13-1-12345-1-0001',
      licenseStatus: 'VALID',
      whoisInfo: JSON.stringify({
        registrantName: 'John Slimming',
        registrar: 'GoDaddy.com, LLC',
        creationDate: '2025-01-10',
        expirationDate: '2027-01-10',
        ipAddress: '103.24.21.189',
        isp: 'AIS Fibre Co.',
        contactEmail: 'owner@fake-slimming-pills.com',
        coordinates: '13.7563,100.5018',
      }),
      aiRiskScore: 88.5,
      aiAnalysis: 'พบคำโฆษณาอวดอ้างสรรพคุณการคุมหิวและลดน้ำหนักอย่างรวดเร็วเกินจริง "ลด 10 กิโลใน 3 วัน" ซึ่งละเมิด พ.ร.บ. อาหาร พ.ศ. 2522 มาตรา 40 และไม่มีประวัติการขอรับอนุมัติโฆษณาตามมาตรา 41',
      evidenceText: 'ชาลดความอ้วนสูตรเร่งรัด คุมหิว สลายไขมันสะสม ลดได้ 10 กิโลภายในเวลา 3 วัน ปลอดภัยไม่มีผลข้างเคียง เลข อย. 13-1-12345-1-0001 สนใจสั่งซื้อติดต่อไลน์แอดด้านล่าง',
      status: CaseStatus.PENDING,
      reporterRole: 'CONSUMER',
    },
  });

  await prisma.case.create({
    data: {
      id: 'CASE-2026-002',
      title: 'ยาสมุนไพรโสมเทวดา รักษามะเร็งร้ายหายขาดใน 1 เดือน',
      url: 'http://cancer-cure-miracle.net/wonder-herb',
      domain: 'cancer-cure-miracle.net',
      productType: ProductType.HERBAL,
      productLicenseNumber: 'G 999/65',
      licenseStatus: 'NOT_FOUND',
      whoisInfo: JSON.stringify({
        registrantName: 'Privacy Protect Co.',
        registrar: 'Namecheap, Inc.',
        creationDate: '2025-05-15',
        expirationDate: '2026-05-15',
        ipAddress: '103.24.21.189',
        isp: 'AIS Fibre Co.',
        contactEmail: 'owner@cancer-cure-miracle.net',
        coordinates: '13.7563,100.5018',
      }),
      aiRiskScore: 98.0,
      aiAnalysis: 'ผลิตภัณฑ์แอบอ้างสรรพคุณรักษามะเร็งซึ่งเป็นโรคต้องห้ามไม่ให้โฆษณาขายยาตาม พ.ร.บ. ยา และเลขทะเบียนตำรับยาสมุนไพร G 999/65 ตรวจไม่พบในระบบฐานข้อมูล อย. (Oryor Portal)',
      evidenceText: 'โรคมะเร็งรักษาหายได้ด้วยยาสมุนไพรโสมเทวดาโบราณ สรรพคุณขับพิษร้าย รักษามะเร็งเต้านม มะเร็งปอด หายขาดได้ภายใน 1 เดือน ไม่ต้องคีโม เลขจดแจ้ง G 999/65',
      status: CaseStatus.UNDER_REVIEW,
      reporterRole: 'INSPECTOR',
      reporterId: inspector.id,
      lawRulesConfirmed: {
        connect: [{ id: law113.id }],
      },
    },
  });

  console.log('Seeded sample cases.');
  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
