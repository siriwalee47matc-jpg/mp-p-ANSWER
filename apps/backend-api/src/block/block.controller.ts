import { Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { BlockService } from './block.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@kp-ads/shared';
import { ApiBearerAuth } from '@nestjs/swagger';

/**
 * Controller exposing endpoint to manually block a case.
 */
@Controller('block')
export class BlockController {
  constructor(private readonly blockService: BlockService) {}

  @Post('case/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.REVIEWER)
  @ApiBearerAuth()
  async blockCase(@Param('id') id: string, @Req() req: any): Promise<any> {
    return this.blockService.blockCase(id, req.user.id);
  }
}
