import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req, Inject, forwardRef } from '@nestjs/common';
import { CasesService } from './cases.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole, CaseStatus, ProductType } from '@kp-ads/shared';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { AiService } from '../ai/ai.service';

@ApiTags('Cases')
@Controller('cases')
export class CasesController {
  constructor(
    private casesService: CasesService,
    private jwtService: JwtService,
    @Inject(forwardRef(() => AiService))
    private aiService: AiService
  ) {}

  @Post()
  @ApiOperation({ summary: 'ส่งเรื่องแจ้งเตือนโฆษณาผิดกฎหมาย (รองรับส่งแบบ Anonymous และล็อกอินเจ้าหน้าที่)' })
  async create(@Body() body: any, @Req() req: Request) {
    // Attempt optional authentication to identify inspector/reporter
    let reporterId: number | undefined;
    let reporterRole: 'CONSUMER' | 'INSPECTOR' | 'SYSTEM' = 'CONSUMER';

    if (body.reporterRole === 'SYSTEM') {
      reporterRole = 'SYSTEM';
    }

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const payload = await this.jwtService.verifyAsync(token, {
          secret: process.env.JWT_SECRET || 'kp-ads-secret-key-123',
        });
        reporterId = payload.id;
        if (payload.role === UserRole.INSPECTOR) {
          reporterRole = 'INSPECTOR';
        }
      } catch {
        // Fallback to Anonymous Consumer if token invalid
      }
    }

    return this.casesService.create({
      title: body.title,
      url: body.url,
      productType: body.productType as ProductType | undefined,
      productLicenseNumber: body.productLicenseNumber,
      evidenceText: body.evidenceText,
      evidenceImage: body.evidenceImage,
      imageSignalsText: body.imageSignalsText,
      reporterRole,
      reporterId,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ดึงรายการเคสทั้งหมด (ต้องล็อกอิน)' })
  @ApiQuery({ name: 'status', required: false, enum: CaseStatus })
  @ApiQuery({ name: 'productType', required: false, enum: ProductType })
  @ApiQuery({ name: 'reporterRole', required: false, example: 'CONSUMER' })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Query('status') status?: CaseStatus,
    @Query('productType') productType?: ProductType,
    @Query('reporterRole') reporterRole?: string,
    @Query('search') search?: string
  ) {
    return this.casesService.findAll({ status, productType, reporterRole, search });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ดึงรายละเอียดเคสตามไอดี (ต้องล็อกอิน)' })
  async findOne(@Param('id') id: string) {
    return this.casesService.findOne(id);
  }

  @Post(':id/analyze')
  @ApiOperation({ summary: 'สั่งให้ AI ตรวจจับพยานหลักฐานและวิเคราะห์ความเสี่ยงอัตโนมัติ (สิทธิ์สาธารณะ)' })
  async analyzeCase(@Param('id') id: string) {
    return this.aiService.evaluateCase(id);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ปรับเปลี่ยนสถานะคดี (นิติกร/ผู้รีวิว/แอดมิน)' })
  async updateStatus(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.casesService.updateStatus(id, body.status as CaseStatus, req.user, {
      lawRuleIds: body.lawRuleIds,
      rejectReason: body.rejectReason,
    });
  }

  @Post(':id/confirm-laws')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LEGAL_OFFICER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ยืนยันมาตราความผิดกฎหมายสำหรับคดีนี้ (เฉพาะนิติกร/แอดมิน)' })
  async confirmLaws(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.casesService.confirmLaws(id, body.lawRuleIds as number[], req.user);
  }
}

// ─────────────────────────────────────────────
// Risk Logs Controller (POST /risk/logs  &  GET /risk/logs)
// ─────────────────────────────────────────────
@ApiTags('Risk Logs')
@Controller('risk')
export class RiskLogsController {
  constructor(
    private casesService: CasesService,
    @Inject(forwardRef(() => AiService))
    private aiService: AiService
  ) {}

  /**
   * Extension auto-scan ส่ง log เข้ามาที่นี่ (สาธารณะ – ไม่ต้องล็อกอิน)
   * Body: { url, title, evidenceText, productLicenseNumber? }
   */
  @Post('logs')
  @ApiOperation({ summary: 'รับบันทึกการสแกนอัตโนมัติจาก Extension (Auto-Detect / Auto-Block)' })
  async logRisk(@Body() body: {
    url: string;
    title?: string;
    evidenceText?: string;
    evidenceImage?: string;
    imageSignalsText?: string;
    productLicenseNumber?: string;
    productType?: ProductType;
    riskLevel?: string;
  }) {
    // สร้าง Case ด้วย reporterRole = SYSTEM
    const newCase = await this.casesService.create({
      title: body.title || `Auto-Scan: ${body.url}`,
      url: body.url,
      productType: body.productType,
      evidenceText: body.evidenceText,
      evidenceImage: body.evidenceImage,
      imageSignalsText: body.imageSignalsText,
      productLicenseNumber: body.productLicenseNumber,
      reporterRole: 'SYSTEM',
    });

    // Trigger AI analysis ทันที
    const analyzed = await this.aiService.evaluateCase(newCase.id);
    return analyzed;
  }

  /**
   * Dashboard ดึง risk logs (เคสที่ reporterRole = SYSTEM) เรียงตาม createdAt desc
   */
  @Get('logs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ดึงรายการ risk logs ของระบบ Auto-Detect (ต้องล็อกอิน)' })
  async getRiskLogs() {
    return this.casesService.findAll({ reporterRole: 'SYSTEM' });
  }
}

// ─────────────────────────────────────────────
// Blocks Controller (POST /blocks)
// ─────────────────────────────────────────────
@ApiTags('Blocks')
@Controller('blocks')
export class BlocksController {
  constructor(private casesService: CasesService) {}

  /**
   * Extension Auto-Block ส่งคำขอบล็อก
   * Body: { tabId?, url, caseId? }
   * ระบบจะ update blockStatus และ add domain to BlockedDomain list
   */
  @Post()
  @ApiOperation({ summary: 'รับคำขอ Auto-Block จาก Extension (สาธารณะ)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REVIEWER)
  @ApiBearerAuth()
  async submitBlock(@Body() body: { tabId?: number; url?: string; caseId?: string }, @Req() req: any) {
    if (body.caseId) {
      return this.casesService.blockCase(body.caseId, req.user.id);
    }
    return { success: false, message: 'caseId is required' };
  }
}
