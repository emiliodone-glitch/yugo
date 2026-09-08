import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators';

/**
 * La raíz del dominio de la API (`/`, fuera del prefijo `/v1`).
 *
 * Toda la API vive bajo `/v1`, así que abrir el dominio pelado daba un 404
 * de Nest y quien despliega no sabía distinguir «la API está viva pero esa
 * ruta no existe» de «la API no responde». Ahora la raíz dice quién es y
 * dónde está la salud: si esto carga, el dominio y el puerto están bien.
 */
@Controller()
export class RootController {
  @Public()
  @Get()
  root() {
    return {
      name: 'Yugo API',
      health: '/v1/health',
      message: 'La API está viva. Los recursos viven bajo /v1.',
    };
  }
}
