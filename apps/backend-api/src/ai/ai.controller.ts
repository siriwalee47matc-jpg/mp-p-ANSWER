import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { Case } from '@prisma/client';
import { ChatDto } from './chat.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

/**
 * Exposes AI evaluation endpoint and Chatbot assistant.
 * All endpoints require authentication to prevent unauthorized AI API usage.
 */
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('evaluate/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async evaluate(@Param('id') id: string): Promise<Case> {
    return this.aiService.evaluateCase(id);
  }

  @Post('chat')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async chat(@Body() chatDto: ChatDto) {
    return this.aiService.chat(chatDto.message, chatDto.history);
  }
}
