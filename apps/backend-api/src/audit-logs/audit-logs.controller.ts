import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@kp-ads/shared';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Audit Logs')
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private auditLogsService: AuditLogsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.EXECUTIVE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ดึงบันทึกรอยเท้าผู้ใช้งานทั้งหมด (สำหรับ Admin/Executive เท่านั้น)' })
  async findAll() {
    return this.auditLogsService.findAll();
  }
}
