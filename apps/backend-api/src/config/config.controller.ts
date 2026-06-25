import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ConfigService } from './config.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@kp-ads/shared';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Config')
@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get('risk-level')
  @ApiOperation({ summary: 'ดึงค่า Global Risk Level ปัจจุบัน' })
  async getRiskLevel() {
    return this.configService.getConfig();
  }

  @Put('risk-level')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REVIEWER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ตั้งค่า Global Risk Level (เฉพาะ Admin/Reviewer)' })
  async setRiskLevel(@Body() body: { riskLevel: string }) {
    return this.configService.setRiskLevel(body.riskLevel);
  }
}
