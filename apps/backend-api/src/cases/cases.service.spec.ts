import { Test, TestingModule } from '@nestjs/testing';
import { CasesService } from './cases.service';
import { PrismaService } from '../prisma/prisma.service';
import { AllowlistService } from '../allowlist/allowlist.service';
import { EmailUtil } from '../utils/email.util';
import { LawsService } from '../laws/laws.service';
import { ScanIntelligenceService } from '../scan-intelligence/scan-intelligence.service';
import { OsintService } from '../osint/osint.service';

describe('CasesService', () => {
  let service: CasesService;
  let prismaService: any;
  let allowlistService: any;
  let emailUtil: any;

  beforeEach(async () => {
    prismaService = {
      case: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      blockedDomain: {
        upsert: jest.fn(),
      },
      blockLog: {
        create: jest.fn(),
      },
      globalConfig: {
        findFirst: jest.fn(),
      },
    };

    allowlistService = {
      findMatchingDomain: jest.fn(),
    };

    emailUtil = {
      sendRiskAlert: jest.fn(),
    };

    const scanIntelligenceService = {
      analyzeInput: jest.fn().mockResolvedValue({
        aiRiskScore: 50,
        aiAnalysis: 'test',
        evidenceQuotes: [],
        violationCategories: [],
        confidence: 80,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CasesService,
        { provide: PrismaService, useValue: prismaService },
        { provide: AllowlistService, useValue: allowlistService },
        { provide: EmailUtil, useValue: emailUtil },
        { provide: LawsService, useValue: {} },
        { provide: OsintService, useValue: {} },
        { provide: ScanIntelligenceService, useValue: scanIntelligenceService },
      ],
    }).compile();

    service = module.get<CasesService>(CasesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a case successfully', async () => {
    const mockCase = { id: 'KP-12345678', domain: 'example.com' };
    prismaService.case.create.mockResolvedValue(mockCase);
    
    const result = await service.create({
      title: 'Test Case',
      url: 'https://example.com/test',
      reporterRole: 'CONSUMER',
    });

    expect(result).toEqual(mockCase);
    expect(prismaService.case.create).toHaveBeenCalled();
  });

  it('should throw an error for blockCase without real AI source', async () => {
    prismaService.case.findUnique.mockResolvedValue({
      id: 'KP-123',
      domain: 'test.com',
      aiSource: 'RULE_BASED_FALLBACK',
    });
    allowlistService.findMatchingDomain.mockResolvedValue(null);

    await expect(service.blockCase('KP-123')).rejects.toThrow('Automatic blocking requires a real AI assessment');
  });

  it('should block case successfully', async () => {
    const targetCase = {
      id: 'KP-123',
      domain: 'test.com',
      aiSource: 'GEMINI',
      aiRiskScore: 90,
      licenseStatus: 'NOT_PROVIDED',
      whoisInfo: JSON.stringify({ sourceType: 'REAL_OSINT' })
    };
    prismaService.case.findUnique.mockResolvedValue(targetCase);
    allowlistService.findMatchingDomain.mockResolvedValue(null);
    prismaService.globalConfig.findFirst.mockResolvedValue({ riskLevel: 'AUTO_BLOCK' });
    prismaService.blockLog.create.mockResolvedValue({ id: 1 });

    const result = await service.blockCase('KP-123');
    expect(result.success).toBe(true);
    expect(result.domain).toBe('test.com');
    expect(prismaService.blockedDomain.upsert).toHaveBeenCalled();
  });

});
