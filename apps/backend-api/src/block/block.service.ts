import { ForbiddenException, Injectable } from '@nestjs/common';
import { CasesService } from '../cases/cases.service';
import { EmailUtil } from '../utils/email.util';

@Injectable()
export class BlockService {
  constructor(
    private readonly emailUtil: EmailUtil,
    private readonly casesService: CasesService,
  ) {}

  async blockCase(caseId: string, _performedByUserId?: number): Promise<any> {
    const caseItem = await this.casesService.findOne(caseId);
    if (!caseItem) {
      throw new ForbiddenException('Case not found');
    }

    const blockResult = await this.casesService.blockCase(caseId);
    if (!blockResult.success) {
      return blockResult;
    }

    await this.emailUtil.sendRiskAlert({
      caseId,
      title: caseItem.title,
      url: caseItem.url,
      domain: caseItem.domain,
      riskScore: caseItem.aiRiskScore ?? 0,
      aiAnalysis: caseItem.aiAnalysis ?? '',
    });

    return blockResult;
  }
}
