import { Module } from '@nestjs/common';
import { ScanIntelligenceService } from './scan-intelligence.service';

@Module({
  providers: [ScanIntelligenceService],
  exports: [ScanIntelligenceService],
})
export class ScanIntelligenceModule {}
