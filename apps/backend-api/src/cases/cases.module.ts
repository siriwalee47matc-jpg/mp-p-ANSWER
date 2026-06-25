import { Module } from '@nestjs/common';
import { CasesService } from './cases.service';
import { CasesController, RiskLogsController, BlocksController } from './cases.controller';

@Module({
  providers: [CasesService],
  controllers: [CasesController, RiskLogsController, BlocksController],
  exports: [CasesService],
})
export class CasesModule {}

