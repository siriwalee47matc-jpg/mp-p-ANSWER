import { Module } from '@nestjs/common';
import { CasesService } from './cases.service';
import { CasesController, RiskLogsController, BlocksController } from './cases.controller';
import { LawsModule } from '../laws/laws.module';
import { OsintModule } from '../osint/osint.module';
import { ScanIntelligenceModule } from '../scan-intelligence/scan-intelligence.module';
import { AllowlistModule } from '../allowlist/allowlist.module';

@Module({
  imports: [LawsModule, OsintModule, ScanIntelligenceModule, AllowlistModule],
  providers: [CasesService],
  controllers: [CasesController, RiskLogsController, BlocksController],
  exports: [CasesService],
})
export class CasesModule {}

