import { Module } from '@nestjs/common';
import { EmailUtil } from './email.util';

/**
 * Simple utilities module exporting EmailUtil.
 */
@Module({
  providers: [EmailUtil],
  exports: [EmailUtil],
})
export class UtilsModule {}
