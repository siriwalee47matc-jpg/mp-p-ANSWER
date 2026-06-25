import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { CasesService } from './cases.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole, CaseStatus, ProductType } from '@kp-ads/shared';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';

@ApiTags('Cases')
@Controller('cases')
export class CasesController {
  constructor(
    private casesService: CasesService,
    private jwtService: JwtService
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
      productType: body.productType as ProductType,
      productLicenseNumber: body.productLicenseNumber,
      evidenceText: body.evidenceText,
      evidenceImage: body.evidenceImage,
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
    return this.casesService.analyzeCase(id);
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
