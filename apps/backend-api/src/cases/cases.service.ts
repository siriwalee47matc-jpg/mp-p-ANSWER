import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CaseStatus, ProductType, UserRole } from '@kp-ads/shared';
import { AllowlistService } from '../allowlist/allowlist.service';
import { LawsService } from '../laws/laws.service';
import { OsintService } from '../osint/osint.service';
import { PrismaService } from '../prisma/prisma.service';
import { ScanIntelligenceService } from '../scan-intelligence/scan-intelligence.service';

@Injectable()
export class CasesService {
  constructor(
    private prisma: PrismaService,
    private lawsService: LawsService,
    private osintService: OsintService,
    private scanIntelligenceService: ScanIntelligenceService,
    private allowlistService: AllowlistService,
  ) {}

  private extractDomain(urlStr: string): string {
    try {
      const url = new URL(urlStr);
      return url.hostname.replace('www.', '');
    } catch {
      return urlStr.replace(/https?:\/\/(www\.)?/i, '').split('/')[0];
    }
  }

  async create(dto: {
    title: string;
    url: string;
    productType?: ProductType;
    productLicenseNumber?: string;
    evidenceText?: string;
    evidenceImage?: string;
    imageSignalsText?: string;
    reporterRole: 'CONSUMER' | 'INSPECTOR' | 'SYSTEM';
    reporterId?: number;
  }) {
    const year = new Date().getFullYear();
    const count = await this.prisma.case.count();
    const id = `CASE-${year}-${String(count + 1).padStart(3, '0')}`;
    const domain = this.extractDomain(dto.url);
    const classification = await this.scanIntelligenceService.analyzeInput({
      title: dto.title,
      url: dto.url,
      evidenceText: dto.evidenceText,
      evidenceImage: dto.evidenceImage,
      imageSignalsText: dto.imageSignalsText,
      productLicenseNumber: dto.productLicenseNumber,
    });
    const resolvedProductType =
      dto.productType && dto.productType !== ProductType.HERBAL && classification.confidence < 0.55
        ? dto.productType
        : classification.productType;
    const enrichedEvidenceText = [dto.evidenceText || '', classification.imageText || ''].filter(Boolean).join('\n\n');

    const newCase = await this.prisma.case.create({
      data: {
        id,
        title: dto.title,
        url: dto.url,
        domain,
        productType: resolvedProductType,
        productLicenseNumber: dto.productLicenseNumber || null,
        evidenceText: enrichedEvidenceText || null,
        evidenceImage: dto.evidenceImage || null,
        reporterRole: dto.reporterRole,
        reporterId: dto.reporterId || null,
        status:
          dto.reporterRole === 'CONSUMER' || dto.reporterRole === 'SYSTEM'
            ? CaseStatus.PENDING
            : CaseStatus.UNDER_REVIEW,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        caseId: id,
        userId: dto.reporterId || null,
        action: 'CREATE_CASE',
        details: `Created case from ${dto.reporterRole}. Source URL: ${dto.url}. Product type ${resolvedProductType} (${Math.round(
          classification.confidence * 100,
        )}% confidence)`,
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

    if (filters.status) where.status = filters.status;
    if (filters.productType) where.productType = filters.productType;
    if (filters.reporterRole) where.reporterRole = filters.reporterRole;
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
      throw new NotFoundException(`Case ${id} not found`);
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
    extra?: { lawRuleIds?: number[]; rejectReason?: string },
  ) {
    const targetCase = await this.findOne(id);

    if (status === CaseStatus.UNDER_REVIEW) {
      if (
        user.role !== UserRole.INSPECTOR &&
        user.role !== UserRole.LEGAL_OFFICER &&
        user.role !== UserRole.REVIEWER &&
        user.role !== UserRole.ADMIN
      ) {
        throw new ForbiddenException('You do not have permission to move this case to review');
      }
    }

    if (status === CaseStatus.APPROVED_BLOCKED || status === CaseStatus.REJECTED) {
      if (user.role !== UserRole.REVIEWER && user.role !== UserRole.ADMIN) {
        throw new ForbiddenException('Only Reviewer or Admin can approve or reject the case');
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

    if (status === CaseStatus.APPROVED_BLOCKED) {
      const allowlistEntry = await this.allowlistService.findMatchingDomain(targetCase.domain);
      if (!allowlistEntry) {
        await this.prisma.blockedDomain.upsert({
          where: { domain: targetCase.domain },
          update: {
            reason: `Blocked from case ${id}: ${targetCase.title}`,
            addedByUserId: user.id,
          },
          create: {
            domain: targetCase.domain,
            reason: `Blocked from case ${id}: ${targetCase.title}`,
            addedByUserId: user.id,
          },
        });
      }
    }

    await this.prisma.auditLog.create({
      data: {
        caseId: id,
        userId: user.id,
        action: `UPDATE_STATUS_${status}`,
        details: `Status changed to ${status} by ${user.name} (${user.role}). ${
          extra?.rejectReason ? `Reject reason: ${extra.rejectReason}` : ''
        } ${extra?.lawRuleIds ? `Confirmed law ids: [${extra.lawRuleIds.join(', ')}]` : ''}`,
      },
    });

    return updated;
  }

  async confirmLaws(id: string, lawRuleIds: number[], user: { id: number; role: UserRole; name: string }) {
    if (user.role !== UserRole.LEGAL_OFFICER && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only Legal Officer or Admin can confirm laws');
    }

    await this.findOne(id);

    const updated = await this.prisma.case.update({
      where: { id },
      data: {
        status: CaseStatus.UNDER_REVIEW,
        lawRulesConfirmed: {
          set: lawRuleIds.map((rid) => ({ id: rid })),
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        caseId: id,
        userId: user.id,
        action: 'CONFIRM_LAWS',
        details: `Legal confirmation by ${user.name}. Law ids: [${lawRuleIds.join(', ')}]`,
      },
    });

    return updated;
  }

  async analyzeCase(id: string) {
    const item = await this.findOne(id);
    const classification = await this.scanIntelligenceService.analyzeInput({
      title: item.title,
      url: item.url,
      evidenceText: item.evidenceText ?? undefined,
      evidenceImage: item.evidenceImage ?? undefined,
      productLicenseNumber: item.productLicenseNumber ?? undefined,
    });
    const osintResult = await this.osintService.inspectUrl(item.url);
    const allowlistEntry = await this.allowlistService.findMatchingDomain(item.domain);
    const officialProductSources = this.lawsService.getOfficialSourcesByProduct(
      classification.productType,
      item.productLicenseNumber,
    );

    const licenseStatus = item.productLicenseNumber?.trim() ? 'CHECK_OFFICIAL_SOURCE' : 'NOT_PROVIDED';

    let aiRiskScore = 30;
    const recommendedLaws: string[] = [];
    const claimSignals = classification.claimSignals;

    if (claimSignals.includes('weight-loss-fast')) {
      recommendedLaws.push('มาตรา 40', 'มาตรา 41');
      aiRiskScore += 45;
    }
    if (claimSignals.includes('disease-cure')) {
      recommendedLaws.push('มาตรา 113');
      aiRiskScore += 55;
    }
    if (claimSignals.includes('fake-authority')) {
      recommendedLaws.push('มาตรา 41');
      aiRiskScore += 18;
    }
    if (claimSignals.includes('fake-safety')) {
      aiRiskScore += 14;
    }
    if (claimSignals.includes('urgency-scarcity')) {
      aiRiskScore += 9;
    }
    if (licenseStatus === 'NOT_PROVIDED') {
      aiRiskScore += 15;
    }
    if (classification.imageText.trim()) {
      aiRiskScore += 6;
    }

    aiRiskScore = Math.min(aiRiskScore, 99.5);

    const rawMatchingRules = await this.prisma.lawRule.findMany({
      where: {
        section: { in: recommendedLaws },
      },
    });
    const matchingRules = this.lawsService.decorateRules(rawMatchingRules);

    const hasRealOsint = osintResult.sourceType === 'REAL_OSINT';
    const hasLicenseToReview = licenseStatus === 'CHECK_OFFICIAL_SOURCE';
    const keywordSignalCount = claimSignals.length;
    const legalSignalCount = matchingRules.length;
    const autoBlockConfidence =
      aiRiskScore >= 85 && hasRealOsint && legalSignalCount >= 1 && keywordSignalCount >= 1 && !hasLicenseToReview;
    const baseRecommendedAction =
      autoBlockConfidence ? 'AUTO_BLOCK' : aiRiskScore >= 60 || legalSignalCount >= 1 ? 'REVIEW_REQUIRED' : 'MONITOR';
    const blockSuppressedByAllowlist =
      allowlistEntry?.action === 'SKIP_SCAN' ||
      allowlistEntry?.action === 'REPORT_ONLY' ||
      allowlistEntry?.action === 'NO_AUTO_BLOCK';
    const finalRecommendedAction = blockSuppressedByAllowlist ? 'REPORT_ONLY' : baseRecommendedAction;
    const riskTier = aiRiskScore >= 80 ? 'HIGH' : aiRiskScore >= 50 ? 'MEDIUM' : 'LOW';

    const aiAnalysis = [
      `AI risk assessment: ${riskTier} (${aiRiskScore}%)`,
      `Detected claims: ${claimSignals.length > 0 ? claimSignals.join(', ') : 'No primary claim cluster matched'}`,
      `Product classification: ${classification.productType} (${Math.round(classification.confidence * 100)}% confidence)`,
      `License verification: ${
        licenseStatus === 'CHECK_OFFICIAL_SOURCE'
          ? 'License number found, verify against the official FDA source before enforcement'
          : 'No license number found on the captured page'
      }`,
      `Image text OCR: ${classification.imageText ? 'Additional text extracted from image evidence' : 'No OCR text extracted'}`,
      'OSINT status: Real DNS and RDAP enrichment captured from live authoritative sources',
      `Allowlist status: ${allowlistEntry ? `${allowlistEntry.listType}/${allowlistEntry.action}` : 'none'}`,
      `Enforcement recommendation: ${finalRecommendedAction}`,
      `Legal review: ${
        recommendedLaws.length > 0
          ? `Review ${recommendedLaws.join(', ')} and confirm with legal officer`
          : 'Needs deeper manual legal review'
      }`,
    ].join('\n');

    const investigationSnapshot = {
      ...osintResult,
      classifier: {
        productType: classification.productType,
        confidence: classification.confidence,
        reasons: classification.reasons,
        claimSignals: classification.claimSignals,
        imageText: classification.imageText,
      },
      allowlist: allowlistEntry,
      officialProductSources,
    };

    const updatedCase = await this.prisma.case.update({
      where: { id },
      data: {
        productType: classification.productType,
        whoisInfo: JSON.stringify(investigationSnapshot),
        licenseStatus,
        aiRiskScore,
        aiAnalysis,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        caseId: id,
        action: 'AI_ANALYSIS',
        details: `AI analysis completed with real OSINT for ${item.domain}. Product ${classification.productType}. License ${licenseStatus}. Risk ${aiRiskScore}%`,
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
      officialProductSources,
      enforcementDecision: {
        recommendedAction: finalRecommendedAction,
        autoBlockEligible: autoBlockConfidence && !blockSuppressedByAllowlist,
        confidence:
          autoBlockConfidence && !blockSuppressedByAllowlist
            ? 'HIGH'
            : baseRecommendedAction === 'REVIEW_REQUIRED'
              ? 'MEDIUM'
              : 'LOW',
        reasons: [
          `risk_score:${aiRiskScore}`,
          `keyword_signals:${keywordSignalCount}`,
          `legal_signals:${legalSignalCount}`,
          `license_status:${licenseStatus}`,
          `osint:${hasRealOsint ? 'REAL' : 'LIMITED'}`,
          `product:${classification.productType}`,
          `allowlist:${allowlistEntry ? `${allowlistEntry.listType}:${allowlistEntry.action}` : 'none'}`,
        ],
      },
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
        details: `AI analysis updated. Risk ${aiRiskScore}%`,
      },
    });

    return updated;
  }

  async blockCase(id: string) {
    const targetCase = await this.findOne(id);
    const allowlistEntry = await this.allowlistService.findMatchingDomain(targetCase.domain);
    if (allowlistEntry) {
      return {
        success: false,
        blocked: false,
        domain: targetCase.domain,
        reason: `Blocked action suppressed by allowlist (${allowlistEntry.listType}/${allowlistEntry.action})`,
      };
    }

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

    const blockLog = await this.prisma.blockLog.create({
      data: {
        caseId: id,
        reason: `Auto-blocked by extension AUTO_BLOCK mode (score: ${targetCase.aiRiskScore ?? 0}%)`,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        caseId: id,
        action: 'AUTO_BLOCK',
        details: `Domain ${targetCase.domain} auto-blocked by system. Risk score ${targetCase.aiRiskScore ?? 0}%`,
      },
    });

    return { success: true, blockLog, domain: targetCase.domain };
  }
}
