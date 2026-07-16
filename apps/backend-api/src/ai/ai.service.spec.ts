import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { CasesService } from '../cases/cases.service';
import { OsintService } from '../osint/osint.service';

describe('AiService', () => {
  let service: AiService;
  let casesService: any;
  let osintService: any;

  beforeEach(async () => {
    casesService = {
      findOne: jest.fn(),
      updateAiAnalysis: jest.fn(),
      clearAiAnalysis: jest.fn(),
    };
    osintService = {
      enrichCase: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: CasesService, useValue: casesService },
        { provide: OsintService, useValue: osintService },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should calibrate assessment correctly', () => {
    const rawAssessment = {
      aiRiskScore: 90,
      aiAnalysis: 'test analysis',
      recommendedAction: 'REVIEW_REQUIRED' as const,
      evidenceQuotes: ['quote1'],
      violationCategories: ['cat1'],
      confidence: 80,
    };
    const analysisResult = { aiRiskScore: 0, analysis: '' };
    const baselineRiskScore = 30;

    const result = service['calibrateAssessment'](rawAssessment, analysisResult, baselineRiskScore);
    expect(result.aiRiskScore).toBe(55);
    expect(result.confidence).toBe(80);
    expect(result.evidenceQuotes).toEqual([]);
  });

  it('should fallback if real AI fails in dev mode', async () => {
    // This requires mock env, but we can test the `chat` fallback logic directly
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    const result = await service.chat('สวัสดี', []);
    expect(result.reply).toContain('[DEV FALLBACK]');
    
    process.env.NODE_ENV = originalEnv;
  });
});
