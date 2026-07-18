import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { DomainsService } from './domains.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@kp-ads/shared';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Blocked Domains')
@Controller('domains')
export class DomainsController {
  constructor(private domainsService: DomainsService) {}

  @Get()
  @ApiOperation({ summary: 'ดึงรายการโดเมนที่ถูกบล็อกทั้งหมด (สาธารณะสำหรับส่วนขยาย)' })
  async findAll() {
    return this.domainsService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.REVIEWER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'เพิ่มโดเมนเข้าบัญชีดำปิดกั้น (Reviewer/Admin เท่านั้น)' })
  async create(@Body() body: any, @Req() req: any) {
    return this.domainsService.create({
      domain: body.domain,
      reason: body.reason,
      addedByUserId: req.user.id,
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ลบโดเมนออกจากบัญชีดำ (เฉพาะ Admin เท่านั้น)' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.domainsService.remove(id);
  }
}
