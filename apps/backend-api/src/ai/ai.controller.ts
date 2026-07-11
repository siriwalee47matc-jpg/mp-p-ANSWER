import { Body, Controller, Param, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { Case } from '@prisma/client';
import { ChatDto } from './chat.dto';

/**
 * Exposes AI evaluation endpoint and Chatbot assistant.
 */
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('evaluate/:id')
  async evaluate(@Param('id') id: string): Promise<Case> {
    return this.aiService.evaluateCase(id);
  }

  @Post('chat')
  async chat(@Body() chatDto: ChatDto) {
    return this.aiService.chat(chatDto.message, chatDto.history);
  }
}
