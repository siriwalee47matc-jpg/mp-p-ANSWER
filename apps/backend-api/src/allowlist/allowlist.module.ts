import { Module } from '@nestjs/common';
import { AllowlistController } from './allowlist.controller';
import { AllowlistService } from './allowlist.service';

@Module({
  providers: [AllowlistService],
  controllers: [AllowlistController],
  exports: [AllowlistService],
})
export class AllowlistModule {}
