import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { SettingsService } from '../../common/settings.service';

export interface ImageClassifier {
  classify(storageKey: string): Promise<{ risk: number; categories: string[] }>;
}

/** Dev stub: approves everything with negligible risk. */
class StubImageClassifier implements ImageClassifier {
  async classify(): Promise<{ risk: number; categories: string[] }> {
    return { risk: 0.01, categories: [] };
  }
}

/** External HTTP provider configured with IMAGE_MODERATION_URL. */
class ExternalImageClassifier implements ImageClassifier {
  async classify(storageKey: string): Promise<{ risk: number; categories: string[] }> {
    const response = await fetch(process.env.IMAGE_MODERATION_URL!, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: storageKey }),
    });
    if (!response.ok) throw new Error(`image moderation ${response.status}`);
    return (await response.json()) as { risk: number; categories: string[] };
  }
}

/**
 * RF-PER-02 / RF-SEG-02: photos are classified before being served. HELD or
 * REJECTED photos land in the moderation queue for human review.
 */
@Injectable()
export class ImageModerationService {
  private readonly logger = new Logger(ImageModerationService.name);
  private readonly classifier: ImageClassifier =
    process.env.IMAGE_MODERATION_PROVIDER === 'external' && process.env.IMAGE_MODERATION_URL
      ? new ExternalImageClassifier()
      : new StubImageClassifier();

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async classifyPhoto(photoId: string): Promise<void> {
    const photo = await this.prisma.photo.findUnique({ where: { id: photoId } });
    if (!photo) return;
    try {
      const { risk } = await this.classifier.classify(photo.storageKey);
      const thresholds = await this.settings.getModerationThresholds();
      const status = risk >= thresholds.reject ? 'REJECTED' : risk >= thresholds.hold ? 'HELD' : 'APPROVED';
      await this.prisma.photo.update({
        where: { id: photoId },
        data: { moderationStatus: status, moderationRisk: risk },
      });
      if (status !== 'APPROVED') {
        await this.prisma.moderationCase.create({
          data: {
            kind: 'AI_HELD',
            priority: 'NORMAL',
            photoId,
            subjectUserId: photo.userId,
            slaDueAt: new Date(Date.now() + 24 * 3600_000),
          },
        });
      }
    } catch (error) {
      this.logger.error(`image classification failed for ${photoId}: ${String(error)}`);
      // Fail safe: keep PENDING (not shown) and open a case.
      await this.prisma.moderationCase.create({
        data: { kind: 'AI_HELD', priority: 'NORMAL', photoId, subjectUserId: photo.userId },
      });
    }
  }
}
