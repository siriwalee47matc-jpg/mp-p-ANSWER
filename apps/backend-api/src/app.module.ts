import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CasesModule } from './cases/cases.module';
import { DomainsModule } from './domains/domains.module';
import { LawsModule } from './laws/laws.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AiModule } from './ai/ai.module';
import { BlockModule } from './block/block.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CasesModule,
    DomainsModule,
    LawsModule,
    AuditLogsModule,
    AiModule,
    BlockModule,
    ScheduleModule.forRoot(),
  ],
})
export class AppModule {}
