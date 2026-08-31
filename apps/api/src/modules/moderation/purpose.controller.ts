import { Controller, Get, Param } from '@nestjs/common';
import { PurposeService } from './purpose.service';
import { CurrentUser, Roles, type AuthUser } from '../../common/decorators';

/**
 * Validación de propósito.
 *
 * Nótese qué endpoint no existe: ninguno que devuelva el puntaje de otra
 * persona a un miembro. El puntaje solo lo ve moderación, y cada quien ve de
 * sí mismo únicamente si ganó la insignia. Un número visible se convierte en
 * un juego de estatus y la gente aprende a moverlo en vez de a comportarse.
 */
@Controller('proposito')
export class PurposeController {
  constructor(private readonly purpose: PurposeService) {}

  /** Lo mío: si gané la insignia y qué me falta para ganarla. */
  @Get('mio')
  mine(@CurrentUser() user: AuthUser) {
    return this.purpose.mine(user.id);
  }

  /** El juicio completo, con sus explicaciones. Solo moderación. */
  @Get(':userId')
  @Roles('MODERATOR', 'COMMUNITY_MANAGER', 'SUPERADMIN')
  assess(@Param('userId') userId: string) {
    return this.purpose.assess(userId);
  }
}
