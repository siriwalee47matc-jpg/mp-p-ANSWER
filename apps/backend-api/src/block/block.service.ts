import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailUtil } from '../utils/email.util';
import { CasesService } from '../cases/cases.service';
import { BlockLog, Case } from '@prisma/client';

/**
 * Service handling domain blocking and related notifications.
 */
@Injectable()
export class BlockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailUtil: EmailUtil,
    private readonly casesService: CasesService,
  ) {}

  /**
   * Blocks the domain of a case, creates a BlockLog entry and sends an email.
   * @param caseId Identifier of the case to block.
   * @param performedByUserId ID of the user performing the block (optional).
   */
  async blockCase(caseId: string, performedByUserId?: number): Promise<BlockLog> {
    const caseItem = await this.casesService.findOne(caseId);
    if (!caseItem) {
      throw new ForbiddenException('Case not found');
    }

    // Upsert blocked domain
    const blockedDomain = await this.prisma.blockedDomain.upsert({
      where: { domain: caseItem.domain },
      update: {
        reason: `บล็อกจากคดีหมายเลข ${caseId}: ${caseItem.title}`,
        addedByUserId: performedByUserId ?? null,
      },
      create: {
        domain: caseItem.domain,
        reason: `บล็อกจากคดีหมายเลข ${caseId}: ${caseItem.title}`,
        addedByUserId: performedByUserId ?? null,
      },
    });

    // Create block log
    const blockLog = await this.prisma.blockLog.create({
      data: {
        caseId: caseId,
        blockedAt: new Date(),
        reason: `Auto‑blocked by risk scheduler (score ${caseItem.aiRiskScore ?? 'N/A'})`,
      },
    });

    // Send notification email
    await this.emailUtil.sendRiskAlert({
      caseId,
      title: caseItem.title,
      url: caseItem.url,
      domain: caseItem.domain,
      riskScore: caseItem.aiRiskScore ?? 0,
      aiAnalysis: caseItem.aiAnalysis ?? '',
    });

    return blockLog;
  }
}
