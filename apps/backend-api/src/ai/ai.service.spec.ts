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

  it('uses a stable fallback model for case analysis when none is configured', () => {
    const originalFallback = process.env.GEMINI_FALLBACK_MODEL;
    delete process.env.GEMINI_FALLBACK_MODEL;

    try {
      expect(service['getGeminiModelCandidates']()).toEqual([
        process.env.GEMINI_MODEL || 'gemini-3.5-flash',
        'gemini-3.1-flash-lite',
      ]);
    } finally {
      if (originalFallback === undefined) delete process.env.GEMINI_FALLBACK_MODEL;
      else process.env.GEMINI_FALLBACK_MODEL = originalFallback;
    }
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

  it('normalizes Gemini chat history to begin with a user and alternate roles', () => {
    const contents = service['buildGeminiChatContents']('คำถามที่สอง', [
      { role: 'assistant', text: 'ข้อความต้อนรับในหน้าเว็บ' },
      { role: 'user', text: 'คำถามแรก' },
      { role: 'assistant', text: 'คำตอบแรก' },
    ]);

    expect(contents).toEqual([
      { role: 'user', parts: [{ text: 'คำถามแรก' }] },
      { role: 'model', parts: [{ text: 'คำตอบแรก' }] },
      { role: 'user', parts: [{ text: 'คำถามที่สอง' }] },
    ]);
  });

  it('drops an assistant-only welcome message before the first question', () => {
    const contents = service['buildGeminiChatContents']('ระบบประเมินความเสี่ยงอย่างไร', [
      { role: 'assistant', text: 'สวัสดีครับ ผมคือผู้ช่วย Sentinel ADS' },
    ]);

    expect(contents).toEqual([
      { role: 'user', parts: [{ text: 'ระบบประเมินความเสี่ยงอย่างไร' }] },
    ]);
  });

  it('uses the stable Gemini fallback model when the primary chat model fails', async () => {
    const originalEnv = {
      provider: process.env.AI_PROVIDER,
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL,
      fallback: process.env.GEMINI_FALLBACK_MODEL,
      nodeEnv: process.env.NODE_ENV,
    };
    process.env.AI_PROVIDER = 'gemini';
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.GEMINI_MODEL = 'gemini-3.5-flash';
    delete process.env.GEMINI_FALLBACK_MODEL;
    process.env.NODE_ENV = 'production';

    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response('quota exceeded', { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: 'คำตอบจากโมเดลสำรอง' }] } }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    try {
      await expect(service.chat('ทดสอบ', [])).resolves.toEqual({ reply: 'คำตอบจากโมเดลสำรอง' });
      expect(fetchMock.mock.calls[0][0]).toContain('/gemini-3.5-flash:generateContent');
      expect(fetchMock.mock.calls[1][0]).toContain('/gemini-3.1-flash-lite:generateContent');
    } finally {
      fetchMock.mockRestore();
      if (originalEnv.provider === undefined) delete process.env.AI_PROVIDER; else process.env.AI_PROVIDER = originalEnv.provider;
      if (originalEnv.apiKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = originalEnv.apiKey;
      if (originalEnv.model === undefined) delete process.env.GEMINI_MODEL; else process.env.GEMINI_MODEL = originalEnv.model;
      if (originalEnv.fallback === undefined) delete process.env.GEMINI_FALLBACK_MODEL; else process.env.GEMINI_FALLBACK_MODEL = originalEnv.fallback;
      if (originalEnv.nodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalEnv.nodeEnv;
    }
  });

  it('returns a clearly labelled system guide when production AI is unavailable', async () => {
    const originalProvider = process.env.AI_PROVIDER;
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.AI_PROVIDER = 'unavailable';
    process.env.NODE_ENV = 'production';

    try {
      const result = await service.chat('ระบบประเมินความเสี่ยงอย่างไร', []);
      expect(result.reply).toContain('คำตอบจากคู่มือ Sentinel ADS');
      expect(result.reply).toContain('คะแนนตั้งแต่ 50%');
    } finally {
      if (originalProvider === undefined) delete process.env.AI_PROVIDER; else process.env.AI_PROVIDER = originalProvider;
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = originalNodeEnv;
    }
  });
});
