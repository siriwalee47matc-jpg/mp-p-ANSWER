import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('public')
  @ApiOperation({ summary: 'ดึงสถิติการติดตั้งแบบสาธารณะ' })
  getPublicMetrics() {
    return this.metricsService.getPublicMetrics();
  }

  @Post('download-click')
  @ApiOperation({ summary: 'บันทึกการกดติดตั้งจากหน้า Landing' })
  recordDownloadClick() {
    return this.metricsService.recordDownloadClick();
  }

  @Post('extension-install')
  @ApiOperation({ summary: 'บันทึกการติดตั้ง Extension โดยไม่เก็บข้อมูลส่วนบุคคล' })
  recordExtensionInstall(@Body() body: { installationId?: string; version?: string }) {
    const installationId = body.installationId?.trim();
    if (!installationId || !/^[A-Za-z0-9_-]{16,128}$/.test(installationId)) {
      throw new BadRequestException('installationId ไม่ถูกต้อง');
    }
    return this.metricsService.recordExtensionInstall(installationId, body.version?.trim().slice(0, 32));
  }
}
