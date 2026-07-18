import { Module } from '@nestjs/common';
import { OsintService } from './osint.service';

@Module({
  providers: [OsintService],
  exports: [OsintService],
})
export class OsintModule {}
