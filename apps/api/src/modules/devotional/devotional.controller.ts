import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { REFLECTION_MAX_LENGTH } from '@yugo/shared';
import { DevotionalService } from './devotional.service';
import { CurrentUser, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/zod.pipe';

const readSchema = z.object({
  reflection: z.string().trim().max(REFLECTION_MAX_LENGTH).optional(),
});

@Controller('devocional')
export class DevotionalController {
  constructor(private readonly devotional: DevotionalService) {}

  @Get('hoy')
  today(@CurrentUser() user: AuthUser) {
    return this.devotional.today(user.id);
  }

  @Post(':id/leido')
  read(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(readSchema)) body: z.infer<typeof readSchema>,
  ) {
    return this.devotional.read(user.id, id, body.reflection);
  }
}
