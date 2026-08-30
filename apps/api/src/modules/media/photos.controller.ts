import { BadRequestException, Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { LIMITS } from '@yugo/shared';
import { StorageService } from './storage.service';
import { PrismaService } from '../../common/prisma.service';
import { ImageModerationService } from '../moderation/image-moderation.service';
import { CurrentUser, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/zod.pipe';

const signSchema = z.object({ contentType: z.string().regex(/^image\/(jpeg|png|webp)$/) });
const confirmSchema = z.object({ key: z.string().min(1), position: z.number().int().min(0).max(5) });

@Controller('photos')
export class PhotosController {
  constructor(
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
    private readonly imageModeration: ImageModerationService,
  ) {}

  @Post('sign-upload')
  signUpload(@CurrentUser() user: AuthUser, @Body(new ZodPipe(signSchema)) body: { contentType: string }) {
    return this.storage.signUpload(`photos/${user.id}`, body.contentType);
  }

  /**
   * RF-PER-02: register an uploaded photo. It enters the image moderation
   * queue and is only served once APPROVED.
   */
  @Post('confirm')
  async confirm(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(confirmSchema)) body: { key: string; position: number },
  ) {
    const count = await this.prisma.photo.count({ where: { userId: user.id } });
    if (count >= LIMITS.PHOTOS_MAX) throw new BadRequestException('too_many_photos');

    const photo = await this.prisma.photo.create({
      data: { userId: user.id, storageKey: body.key, position: body.position },
    });
    // Classification runs out-of-band; dev stub approves instantly.
    void this.imageModeration.classifyPhoto(photo.id);
    return photo;
  }

  @Get('mine')
  async mine(@CurrentUser() user: AuthUser) {
    const photos = await this.prisma.photo.findMany({
      where: { userId: user.id },
      orderBy: { position: 'asc' },
    });
    return Promise.all(
      photos.map(async (p) => ({ ...p, url: await this.storage.signDownload(p.storageKey) })),
    );
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.prisma.photo.deleteMany({ where: { id, userId: user.id } });
    return { ok: true };
  }
}
