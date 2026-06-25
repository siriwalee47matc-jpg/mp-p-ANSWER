import { Controller, Param, Post, Body } from '@nestjs/common';
import { BlockService } from './block.service';

/**
 * Controller exposing endpoint to manually block a case.
 */
@Controller('block')
export class BlockController {
  constructor(private readonly blockService: BlockService) {}

  @Post('case/:id')
  async blockCase(@Param('id') id: string, @Body('performedByUserId') performedByUserId?: number): Promise<any> {
    return this.blockService.blockCase(id, performedByUserId);
  }
}
