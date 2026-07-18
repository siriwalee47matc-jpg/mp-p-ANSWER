import { Module, forwardRef } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { CasesModule } from '../cases/cases.module';

@Module({
  imports: [forwardRef(() => CasesModule)],
  providers: [AiService],
  controllers: [AiController],
  exports: [AiService],
})
export class AiModule {}
