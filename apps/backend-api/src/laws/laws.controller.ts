import { Controller, Get, UseGuards } from '@nestjs/common';
import { LawsService } from './laws.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Laws')
@Controller('laws')
export class LawsController {
  constructor(private lawsService: LawsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ดึงมาตรากฎหมายทั้งหมดเพื่อใช้ตรวจสอบยืนยันประกอบคดี' })
  async findAll() {
    return this.lawsService.findAll();
  }
}
