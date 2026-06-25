import { Controller, Param, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { Case } from '@prisma/client';

/**
 * Exposes AI evaluation endpoint.
 */
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('evaluate/:id')
  async evaluate(@Param('id') id: string): Promise<Case> {
    return this.aiService.evaluateCase(id);
  }
}
