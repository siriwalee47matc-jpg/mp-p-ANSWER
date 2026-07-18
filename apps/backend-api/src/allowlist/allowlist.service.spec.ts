import { Test, TestingModule } from '@nestjs/testing';
import { AllowlistService } from './allowlist.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AllowlistService', () => {
  let service: AllowlistService;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      domainAllowlist: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllowlistService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<AllowlistService>(AllowlistService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should match exact domain', async () => {
    prismaService.domainAllowlist.findMany.mockResolvedValue([
      { domain: 'lazada.co.th', action: 'SKIP_SCAN' },
    ]);
    const result = await service.findMatchingDomain('lazada.co.th');
    expect(result).not.toBeNull();
    expect(result?.domain).toBe('lazada.co.th');
  });

  it('should match subdomain to wildcard domain', async () => {
    prismaService.domainAllowlist.findMany.mockResolvedValue([
      { domain: 'shopee.co.th', action: 'REPORT_ONLY' },
    ]);
    const result = await service.findMatchingDomain('shop.shopee.co.th');
    expect(result).not.toBeNull();
    expect(result?.domain).toBe('shopee.co.th');
  });

  it('should return null for unmatched domain', async () => {
    prismaService.domainAllowlist.findMany.mockResolvedValue([
      { domain: 'google.com', action: 'SKIP_SCAN' },
    ]);
    const result = await service.findMatchingDomain('badsite.com');
    expect(result).toBeNull();
  });
});
