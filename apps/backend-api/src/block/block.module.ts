import { Module } from '@nestjs/common';
import { BlockService } from './block.service';
import { BlockController } from './block.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CasesModule } from '../cases/cases.module';
import { UtilsModule } from '../utils/utils.module';

/**
 * Module grouping block‑related functionality.
 */
@Module({
  imports: [PrismaModule, CasesModule, UtilsModule],
  providers: [BlockService],
  controllers: [BlockController],
  exports: [BlockService],
})
export class BlockModule {}
