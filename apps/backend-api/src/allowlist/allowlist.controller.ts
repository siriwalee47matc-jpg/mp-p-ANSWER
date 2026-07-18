import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@kp-ads/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AllowlistService } from './allowlist.service';

@ApiTags('Allowlist')
@Controller('allowlist')
export class AllowlistController {
  constructor(private allowlistService: AllowlistService) {}

  @Get()
  @ApiOperation({ summary: 'Get trusted official and marketplace allowlist entries for extension sync' })
  async findAll() {
    return this.allowlistService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REVIEWER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add an allowlist entry' })
  async create(@Body() body: any) {
    return this.allowlistService.create({
      domain: body.domain,
      listType: body.listType,
      action: body.action,
      reason: body.reason,
      notes: body.notes,
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove an allowlist entry' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.allowlistService.remove(id);
  }
}
