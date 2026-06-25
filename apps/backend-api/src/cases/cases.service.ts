import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CaseStatus, ProductType, UserRole } from '@kp-ads/shared';

@Injectable()
export class CasesService {
  constructor(private prisma: PrismaService) {}

  private extractDomain(urlStr: string): string {
    try {
      const url = new URL(urlStr);
      return url.hostname.replace('www.', '');
    } catch {
      // Fallback if URL is invalid
      return urlStr.replace(/https?:\/\/(www\.)?/, '').split('/')[0];
    }
  }

  async create(dto: {
    title: string;
    url: string;
    productType: ProductType;
    productLicenseNumber?: string;
    evidenceText?: string;
    evidenceImage?: string;
    reporterRole: 'CONSUMER' | 'INSPECTOR' | 'SYSTEM';
    reporterId?: number;
  }) {
    const year = new Date().getFullYear();
    const count = await this.prisma.case.count();
    const id = `CASE-${year}-${String(count + 1).padStart(3, '0')}`;
    const domain = this.extractDomain(dto.url);

    const newCase = await this.prisma.case.create({
      data: {
        id,
        title: dto.title,
        url: dto.url,
        domain,
        productType: dto.productType,
        productLicenseNumber: dto.productLicenseNumber || null,
        evidenceText: dto.evidenceText || null,
        evidenceImage: dto.evidenceImage || null,
        reporterRole: dto.reporterRole,
        reporterId: dto.reporterId || null,
        status: (dto.reporterRole === 'CONSUMER' || dto.reporterRole === 'SYSTEM') ? CaseStatus.PENDING : CaseStatus.UNDER_REVIEW,
      },
    });

    // Create Audit Log
    await this.prisma.auditLog.create({
      data: {
        caseId: id,
        userId: dto.reporterId || null,
        action: 'CREATE_CASE',
        details: `สร้างเคสจากบทบาท ${dto.reporterRole} แหล่งอ้างอิง URL: ${dto.url}`,
      },
    });

    return newCase;
  }

  async findAll(filters: {
    status?: CaseStatus;
    search?: string;
    productType?: ProductType;
    reporterRole?: string;
  }) {
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.productType) {
      where.productType = filters.productType;
    }
    if (filters.reporterRole) {
      where.reporterRole = filters.reporterRole;
    }
    if (filters.search) {
      where.OR = [
        { id: { contains: filters.search, mode: 'insensitive' } },
        { title: { contains: filters.search, mode: 'insensitive' } },
        { url: { contains: filters.search, mode: 'insensitive' } },
        { domain: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const items = await this.prisma.case.findMany({
      where,
      include: {
        lawRulesConfirmed: true,
        reporter: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return items.map((item: any) => {
      if (item.whoisInfo && typeof item.whoisInfo === 'string') {
        try {
          item.whoisInfo = JSON.parse(item.whoisInfo);
        } catch {
          item.whoisInfo = null;
        }
      }
      return item;
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.case.findUnique({
      where: { id },
      include: {
        lawRulesConfirmed: true,
        auditLogs: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        reporter: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`ไม่พบรหัสคดี ${id}`);
    }

    if (item.whoisInfo && typeof item.whoisInfo === 'string') {
      try {
        item.whoisInfo = JSON.parse(item.whoisInfo);
      } catch {
        item.whoisInfo = null;
      }
    }

    return item;
  }

  async updateStatus(
    id: string,
    status: CaseStatus,
    user: { id: number; role: UserRole; email: string; name: string },
    extra?: { lawRuleIds?: number[]; rejectReason?: string }
  ) {
    const targetCase = await this.findOne(id);

    // RBAC validation
    if (status === CaseStatus.UNDER_REVIEW) {
      if (user.role !== UserRole.INSPECTOR && user.role !== UserRole.LEGAL_OFFICER && user.role !== UserRole.REVIEWER && user.role !== UserRole.ADMIN) {
        throw new ForbiddenException('คุณไม่มีสิทธิ์เปลี่ยนสถานะคดีเป็นระหว่างตรวจสอบ');
      }
    }

    if (status === CaseStatus.APPROVED_BLOCKED || status === CaseStatus.REJECTED) {
      if (user.role !== UserRole.REVIEWER && user.role !== UserRole.ADMIN) {
        throw new ForbiddenException('สิทธิ์เฉพาะหัวหน้าผู้ตรวจทาน (Reviewer) หรือผู้ดูแลระบบเท่านั้นที่จะอนุมัติหรือปฏิเสธคดีได้');
      }
    }

    const updateData: any = { status };

    if (extra?.lawRuleIds) {
      updateData.lawRulesConfirmed = {
        set: extra.lawRuleIds.map((rid) => ({ id: rid })),
      };
    }

    const updated = await this.prisma.case.update({
      where: { id },
      data: updateData,
    });

    // If approved and blocked, automatically add domain to BlockedDomain list
    if (status === CaseStatus.APPROVED_BLOCKED) {
      await this.prisma.blockedDomain.upsert({
        where: { domain: targetCase.domain },
        update: {
          reason: `บล็อกจากคดีหมายเลข ${id}: ${targetCase.title}`,
          addedByUserId: user.id,
        },
        create: {
          domain: targetCase.domain,
          reason: `บล็อกจากคดีหมายเลข ${id}: ${targetCase.title}`,
          addedByUserId: user.id,
        },
      });
    }

    // Create Audit Log
    await this.prisma.auditLog.create({
      data: {
        caseId: id,
        userId: user.id,
        action: `UPDATE_STATUS_${status}`,
        details: `เปลี่ยนสถานะเป็น ${status} โดย ${user.name} (${user.role}). ${
          extra?.rejectReason ? `เหตุผลที่ปฏิเสธ: ${extra.rejectReason}` : ''
        } ${extra?.lawRuleIds ? `ยืนยันความรับผิดตามมาตรากฎหมายไอดี: [${extra.lawRuleIds.join(', ')}]` : ''}`,
      },
    });

    return updated;
  }

  async confirmLaws(id: string, lawRuleIds: number[], user: { id: number; role: UserRole; name: string }) {
    if (user.role !== UserRole.LEGAL_OFFICER && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('สิทธิ์ยืนยันข้อกฎหมายเฉพาะนิติกร (Legal Officer) เท่านั้น');
    }

    await this.findOne(id);

    const updated = await this.prisma.case.update({
      where: { id },
      data: {
        status: CaseStatus.UNDER_REVIEW, // Keep under review until Reviewer approves
        lawRulesConfirmed: {
          set: lawRuleIds.map((rid) => ({ id: rid })),
        },
      },
    });

    // Create Audit Log
    await this.prisma.auditLog.create({
      data: {
        caseId: id,
        userId: user.id,
        action: 'CONFIRM_LAWS',
        details: `นิติกร ${user.name} ยืนยันข้อกฎหมายสำหรับดำเนินคดี ได้แก่ ไอดีมาตรา: [${lawRuleIds.join(', ')}]`,
      },
    });

    return updated;
  }

  async analyzeCase(id: string) {
    const item = await this.findOne(id);
    const content = (item.title + ' ' + (item.evidenceText || '')).toLowerCase();

    // 1. Mock WHOIS Lookup
    const mockWhois = {
      registrantName: this.generateMockRegistrant(item.domain),
      registrar: this.generateMockRegistrar(item.domain),
      creationDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000 * 2).toISOString().split('T')[0], // 2 years ago
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],   // 1 year from now
      ipAddress: item.url?.includes('localhost') ? '127.0.0.1' : '103.24.21.189',
      isp: item.url?.includes('localhost') ? 'Local Loopback' : 'AIS Fibre Co.',
      contactEmail: 'owner@' + item.domain.replace('localhost', 'herbalbeauty-sales.co.th'),
      coordinates: '13.7563,100.5018',
    };

    // 2. Mock Oryor license check
    let licenseStatus = 'NOT_FOUND';
    if (item.productLicenseNumber) {
      // If license ends with odd number -> VALID, if even -> INVALID, empty or other -> NOT_FOUND
      const cleanNum = item.productLicenseNumber.replace(/[^0-9]/g, '');
      if (cleanNum.length > 0) {
        const lastDigit = parseInt(cleanNum[cleanNum.length - 1], 10);
        if (lastDigit % 2 !== 0) {
          licenseStatus = 'VALID';
        } else {
          licenseStatus = 'INVALID';
        }
      }
    }

    // 3. AI Law Recommendation & Risk Assessment
    let aiRiskScore = 30.0; // Base score
    const recommendedLaws: string[] = [];
    const keywordsMatches: string[] = [];

    // Analyze based on text keywords
    if (content.includes('ลดน้ำหนัก') || content.includes('คุมหิว') || content.includes('ลด 10 กิโล') || content.includes('ลดความอ้วน') || content.includes('สลายไขมัน')) {
      recommendedLaws.push('มาตรา 40', 'มาตรา 41');
      keywordsMatches.push('ลดน้ำหนัก/คุมหิว/ลด 10 กิโล');
      aiRiskScore += 45;
    }

    if (content.includes('มะเร็ง') || content.includes('รักษาหายขาด') || content.includes('ยารักษา') || content.includes('หายขาดใน')) {
      recommendedLaws.push('มาตรา 113');
      keywordsMatches.push('มะเร็ง/รักษาหายขาด/รักษาโรค');
      aiRiskScore += 55;
    }

    if (content.includes('ขาวใส') || content.includes('ผิวขาว') || content.includes('เด้งดึ๋ง') || content.includes('เครื่องสำอาง')) {
      recommendedLaws.push('มาตรา 41 (เครื่องสำอาง)');
      keywordsMatches.push('ขาวใส/ผิวขาว/สรรพคุณอวดอ้างเครื่องสำอาง');
      aiRiskScore += 30;
    }

    if (licenseStatus === 'NOT_FOUND' || licenseStatus === 'INVALID') {
      aiRiskScore += 15;
    }

    // Max cap risk score at 99.5
    aiRiskScore = Math.min(aiRiskScore, 99.5);

    // Find recommended law rules IDs in DB
    const matchingRules = await this.prisma.lawRule.findMany({
      where: {
        section: { in: recommendedLaws },
      },
    });

    const aiAnalysis = `ระบบ AI ตรวจสอบเนื้อหาพบความเสี่ยงระดับ ${
      aiRiskScore >= 80 ? 'สูงมาก (HIGH)' : aiRiskScore >= 50 ? 'ปานกลาง (MEDIUM)' : 'ต่ำ (LOW)'
    } (${aiRiskScore}%) \n` +
      `- ตรวจพบคำอวดอ้างสรรพคุณโฆษณา: [${keywordsMatches.join(', ')}] \n` +
      `- สถานะใบอนุญาตผลิตภัณฑ์ อย.: ${licenseStatus} \n` +
      `- ข้อเสนอแนะทางกฎหมาย: แนะนำให้บังคับใช้ ${recommendedLaws.join(' และ ')} เนื่องจากมีการโฆษณาชวนเชื่อที่เกินความจริงและไม่เป็นธรรมต่อผู้บริโภค`;

    // Update case with analysis
    const updatedCase = await this.prisma.case.update({
      where: { id },
      data: {
        whoisInfo: JSON.stringify(mockWhois),
        licenseStatus,
        aiRiskScore,
        aiAnalysis,
      },
    });

    // Create Audit Log
    await this.prisma.auditLog.create({
      data: {
        caseId: id,
        action: 'AI_ANALYSIS',
        details: `รันระบบตรวจจับความเสี่ยง AI อัตโนมัติ: ดึงข้อมูล WHOIS โดเมน ${item.domain}, เช็คเลข อย. ${item.productLicenseNumber || 'ไม่ระบุ'} ได้ผลลัพธ์สถานะเป็น ${licenseStatus}, ประเมินระดับความเสี่ยงที่ ${aiRiskScore}%`,
      },
    });

    if (updatedCase && typeof updatedCase.whoisInfo === 'string') {
      try {
        updatedCase.whoisInfo = JSON.parse(updatedCase.whoisInfo);
      } catch {
        updatedCase.whoisInfo = null;
      }
    }

    return {
      ...updatedCase,
      matchingRules,
    };
  }

  async updateAiAnalysis(id: string, aiRiskScore: number, aiAnalysis: string) {
    const updated = await this.prisma.case.update({
      where: { id },
      data: {
        aiRiskScore,
        aiAnalysis,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        caseId: id,
        action: 'AI_RE_ANALYSIS',
        details: `อัปเดตผลวิเคราะห์ด้วย Real AI: ความเสี่ยง ${aiRiskScore}%`,
      },
    });

    return updated;
  }

  async blockCase(id: string) {
    const targetCase = await this.findOne(id);

    // Add domain to BlockedDomain list
    await this.prisma.blockedDomain.upsert({
      where: { domain: targetCase.domain },
      update: {
        reason: `Auto-blocked by system (risk score: ${targetCase.aiRiskScore ?? 'N/A'}%) from case ${id}`,
      },
      create: {
        domain: targetCase.domain,
        reason: `Auto-blocked by system (risk score: ${targetCase.aiRiskScore ?? 'N/A'}%) from case ${id}`,
      },
    });

    // Create BlockLog
    const blockLog = await this.prisma.blockLog.create({
      data: {
        caseId: id,
        reason: `Auto-blocked by extension AUTO_BLOCK mode (score: ${targetCase.aiRiskScore ?? 0}%)`,
      },
    });

    // Create Audit Log
    await this.prisma.auditLog.create({
      data: {
        caseId: id,
        action: 'AUTO_BLOCK',
        details: `ระบบ Auto-Block ปิดกั้นโดเมน ${targetCase.domain} โดยอัตโนมัติ คะแนนความเสี่ยง: ${targetCase.aiRiskScore ?? 0}%`,
      },
    });

    return { success: true, blockLog, domain: targetCase.domain };
  }

  private generateMockRegistrant(domain: string): string {
    const list = ['WHOIS Privacy Protection Service', 'Global Domains Registrant', 'Private Person', 'Nattawut Sakul', 'Somchai Advertising Co.'];
    const idx = Math.abs(this.hashCode(domain)) % list.length;
    return list[idx];
  }

  private generateMockRegistrar(domain: string): string {
    const list = ['GoDaddy.com, LLC', 'Namecheap, Inc.', 'PDR Ltd. d/b/a PublicDomainRegistry', 'Tucows Domains Inc.'];
    const idx = Math.abs(this.hashCode(domain)) % list.length;
    return list[idx];
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return hash;
  }
}
