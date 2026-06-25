import { Controller, Param, Post, Body } from '@nestjs/common';
import { BlockService } from './block.service';
import { BlockLog } from '@prisma/client';

/**
 * Controller exposing endpoint to manually block a case.
 */
@Controller('block')
export class BlockController {
  constructor(private readonly blockService: BlockService) {}

  @Post('case/:id')
  async blockCase(@Param('id') id: string, @Body('performedByUserId') performedByUserId?: number): Promise<BlockLog> {
    return this.blockService.blockCase(id, performedByUserId);
  }
}
