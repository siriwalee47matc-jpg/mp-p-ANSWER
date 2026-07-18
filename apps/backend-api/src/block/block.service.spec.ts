import { ForbiddenException } from '@nestjs/common';
import { BlockService } from './block.service';
import { CasesService } from '../cases/cases.service';
import { EmailUtil } from '../utils/email.util';

describe('BlockService', () => {
  it('rejects unknown cases', async () => {
    const cases = { findOne: jest.fn().mockResolvedValue(null) };
    const service = new BlockService({} as EmailUtil, cases as unknown as CasesService);
    await expect(service.blockCase('missing')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('sends an alert after a successful block', async () => {
    const caseItem = {
      title: 'Unsafe ad',
      url: 'https://example.com/ad',
      domain: 'example.com',
      aiRiskScore: 95,
      aiAnalysis: 'High risk',
    };
    const cases = {
      findOne: jest.fn().mockResolvedValue(caseItem),
      blockCase: jest.fn().mockResolvedValue({ success: true, domain: 'example.com' }),
    };
    const email = { sendRiskAlert: jest.fn().mockResolvedValue(undefined) };
    const service = new BlockService(email as unknown as EmailUtil, cases as unknown as CasesService);

    await expect(service.blockCase('CASE-1')).resolves.toEqual({ success: true, domain: 'example.com' });
    expect(email.sendRiskAlert).toHaveBeenCalledWith({
      caseId: 'CASE-1',
      title: caseItem.title,
      url: caseItem.url,
      domain: caseItem.domain,
      riskScore: 95,
      aiAnalysis: caseItem.aiAnalysis,
    });
  });
});
