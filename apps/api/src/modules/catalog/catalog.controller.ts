import { Controller, Get, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { ContentService } from '../../common/content.service';
import { Public } from '../../common/decorators';

@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly content: ContentService,
  ) {}

  /** RF-ADM-10: banners activos de la pantalla principal. */
  @Get('banners')
  banners() {
    return this.content.activeBanners();
  }

  /** RF-SEG-06: consejos de seguridad administrables. */
  @Public()
  @Get('safety-tips')
  safetyTips() {
    return this.content.safetyTips();
  }

  @Public()
  @Get('denominations')
  denominations() {
    return this.catalog.denominations();
  }

  @Public()
  @Get('service-areas')
  serviceAreas() {
    return this.catalog.serviceAreas();
  }

  @Public()
  @Get('group-categories')
  groupCategories() {
    return this.catalog.groupCategories();
  }

  @Public()
  @Get('churches')
  churches(@Query('q') q?: string) {
    return this.catalog.churches(q);
  }

  @Public()
  @Get('covenant')
  covenant() {
    return this.catalog.covenant();
  }
}
