import { Injectable } from '@nestjs/common';
import { CasesService } from '../cases/cases.service';

/**
 * Service responsible for AI related operations.
 * Currently it simply proxies to CasesService.analyzeCase which contains the
 * mocked AI logic. In a real implementation this could call an external AI API.
 */
@Injectable()
export class AiService {
  constructor(private readonly casesService: CasesService) {}

  /**
   * Evaluates a case using AI analysis and returns the updated case.
   * @param caseId The case identifier.
   */
  async evaluateCase(caseId: string) {
    // Delegates to the existing analysis logic.
    return this.casesService.analyzeCase(caseId);
  }
}
