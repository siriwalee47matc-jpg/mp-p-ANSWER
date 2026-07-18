import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

class CreateFeedbackDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  /** Public – any authenticated browser can submit */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ValidationPipe({ whitelist: true })) dto: CreateFeedbackDto,
    @Req() req: Request,
  ) {
    const userAgent =
      ((req.headers as unknown) as Record<string, string>)['user-agent'] || undefined;
    return this.feedbackService.create({ ...dto, userAgent });
  }

  /** Protected – admin only */
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.feedbackService.findAll();
  }
}
