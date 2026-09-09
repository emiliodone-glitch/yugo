import { BadRequestException, Injectable } from '@nestjs/common';
import { VOICE_NOTE_CONTENT_TYPES, VOICE_NOTE_MAX_SECONDS } from '@yugo/shared';
import { PrismaService } from '../../common/prisma.service';
import { StorageService } from '../media/storage.service';
import { ProfilesService } from './profiles.service';

/**
 * Testimonio en la propia voz (RF-PER-12).
 *
 * Uno por persona, veinte segundos como máximo, en almacenamiento privado con
 * URL firmada igual que las fotos. No hay clasificador automático de voz, así
 * que cada audio abre un caso de moderación y solo se publica cuando una
 * persona del equipo lo escucha y lo aprueba (RF-SEG-02). Mientras tanto la
 * persona puede oír el suyo; nadie más.
 */
@Injectable()
export class VoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly profiles: ProfilesService,
  ) {}

  signUpload(userId: string, contentType: string) {
    if (!(VOICE_NOTE_CONTENT_TYPES as readonly string[]).includes(contentType)) {
      throw new BadRequestException('unsupported_audio_type');
    }
    return this.storage.signUpload(`voice/${userId}`, contentType);
  }

  async confirm(userId: string, key: string, durationMs: number, contentType: string) {
    if (!key.startsWith(`voice/${userId}/`)) throw new BadRequestException('invalid_key');
    if (durationMs < 1000) throw new BadRequestException('audio_too_short');
    if (durationMs > VOICE_NOTE_MAX_SECONDS * 1000 + 1500) {
      throw new BadRequestException('audio_too_long');
    }

    // Replacing the audio replaces the review too: an old open case about a
    // recording nobody can hear any more would only confuse the queue.
    const previous = await this.prisma.voiceNote.findUnique({ where: { userId } });
    if (previous) {
      await this.prisma.moderationCase.updateMany({
        where: { voiceNoteId: previous.id, status: { in: ['OPEN', 'IN_REVIEW'] } },
        data: { status: 'RESOLVED', decision: 'SUPERSEDED', resolvedAt: new Date() },
      });
    }

    const note = await this.prisma.voiceNote.upsert({
      where: { userId },
      update: { storageKey: key, durationMs, contentType, moderationStatus: 'PENDING' },
      create: { userId, storageKey: key, durationMs, contentType, moderationStatus: 'PENDING' },
    });
    await this.prisma.moderationCase.create({
      data: {
        kind: 'AI_HELD',
        priority: 'NORMAL',
        voiceNoteId: note.id,
        subjectUserId: userId,
        slaDueAt: new Date(Date.now() + 24 * 3600_000),
      },
    });
    // A replaced approved audio no longer counts until the new one is approved.
    await this.profiles.recomputeCompleteness(userId);
    return this.describe(note);
  }

  async mine(userId: string) {
    const note = await this.prisma.voiceNote.findUnique({ where: { userId } });
    return note ? this.describe(note) : null;
  }

  async remove(userId: string) {
    const note = await this.prisma.voiceNote.findUnique({ where: { userId } });
    if (!note) return { removed: false };
    await this.prisma.moderationCase.updateMany({
      where: { voiceNoteId: note.id, status: { in: ['OPEN', 'IN_REVIEW'] } },
      data: { status: 'RESOLVED', decision: 'WITHDRAWN', resolvedAt: new Date() },
    });
    await this.prisma.voiceNote.delete({ where: { id: note.id } });
    await this.profiles.recomputeCompleteness(userId);
    return { removed: true };
  }

  /** Signed URL only for an APPROVED note; what other members get to hear. */
  async publicUrl(userId: string): Promise<{ url: string; durationMs: number } | null> {
    const note = await this.prisma.voiceNote.findUnique({ where: { userId } });
    if (!note || note.moderationStatus !== 'APPROVED') return null;
    return { url: await this.storage.signDownload(note.storageKey), durationMs: note.durationMs };
  }

  private async describe(note: {
    id: string;
    storageKey: string;
    durationMs: number;
    moderationStatus: string;
    createdAt: Date;
  }) {
    return {
      id: note.id,
      status: note.moderationStatus as 'PENDING' | 'APPROVED' | 'HELD' | 'REJECTED',
      durationMs: note.durationMs,
      url: await this.storage.signDownload(note.storageKey),
      createdAt: note.createdAt.toISOString(),
    };
  }
}
