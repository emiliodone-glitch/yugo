import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { VideoCallItem, VideoCallsResponse } from '@yugo/shared';
import { PrismaService } from '../../common/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Videollamada dentro de la app (RF-CON-12).
 *
 * Quince minutos, agendada desde el chat, sin compartir número: el primer
 * cara a cara ocurre dentro de Yugo, con las mismas reglas de respeto y con
 * la posibilidad de reportar después. La sala la crea un proveedor detrás de
 * una abstracción mínima (hoy Daily); sin proveedor configurado la función
 * se declara no disponible en vez de fallar a medias.
 */
export interface VideoProvider {
  readonly name: string;
  readonly configured: boolean;
  createRoom(name: string, expiresAt: Date): Promise<{ url: string }>;
  /** Token de entrada nominal; null cuando el proveedor no los usa. */
  meetingToken(roomName: string, userName: string, expiresAt: Date): Promise<string | null>;
}

/** Daily (https://daily.co): salas privadas, dos participantes, caducan solas. */
export class DailyProvider implements VideoProvider {
  readonly name = 'DAILY';
  private readonly logger = new Logger(DailyProvider.name);
  constructor(
    private readonly apiKey = process.env.DAILY_API_KEY ?? '',
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  get configured() {
    return this.apiKey.length > 0;
  }

  private async call<T>(path: string, body: unknown): Promise<T> {
    const response = await this.fetchImpl(`https://api.daily.co/v1${path}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      this.logger.error(`Daily ${path} failed: ${response.status} ${text.slice(0, 200)}`);
      throw new BadRequestException('video_provider_error');
    }
    return (await response.json()) as T;
  }

  async createRoom(name: string, expiresAt: Date) {
    const room = await this.call<{ url: string }>('/rooms', {
      name,
      privacy: 'private',
      properties: {
        exp: Math.floor(expiresAt.getTime() / 1000),
        max_participants: 2,
        enable_chat: false,
        enable_knocking: false,
        enable_screenshare: false,
        eject_at_room_exp: true,
        lang: 'es',
      },
    });
    return { url: room.url };
  }

  async meetingToken(roomName: string, userName: string, expiresAt: Date) {
    const token = await this.call<{ token: string }>('/meeting-tokens', {
      properties: {
        room_name: roomName,
        user_name: userName,
        exp: Math.floor(expiresAt.getTime() / 1000),
        is_owner: false,
      },
    });
    return token.token;
  }
}

/** Sin proveedor: la función existe pero se declara no disponible. */
export class StubProvider implements VideoProvider {
  readonly name = 'STUB';
  readonly configured = false;
  async createRoom(): Promise<{ url: string }> {
    throw new BadRequestException('video_unavailable');
  }
  async meetingToken() {
    return null;
  }
}

/** Minutos antes de la hora en que ya se puede entrar. */
export const JOIN_BEFORE_MIN = 10;
/** Margen después del fin para quien llegó tarde. */
export const JOIN_AFTER_MIN = 15;

export function joinWindow(scheduledAt: Date, durationMin: number) {
  const opensAt = new Date(scheduledAt.getTime() - JOIN_BEFORE_MIN * 60_000);
  const closesAt = new Date(scheduledAt.getTime() + (durationMin + JOIN_AFTER_MIN) * 60_000);
  return { opensAt, closesAt };
}

export function isJoinable(scheduledAt: Date, durationMin: number, now = new Date()) {
  const { opensAt, closesAt } = joinWindow(scheduledAt, durationMin);
  return now >= opensAt && now <= closesAt;
}

@Injectable()
export class VideoCallsService {
  private provider: VideoProvider;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {
    const daily = new DailyProvider();
    this.provider = daily.configured ? daily : new StubProvider();
  }

  /** Inyección manual para pruebas y para cambiar de proveedor sin redeploy. */
  useProvider(provider: VideoProvider) {
    this.provider = provider;
  }

  get available() {
    return this.provider.configured;
  }

  private async assertMember(matchId: string, userId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        userA: { include: { profile: { select: { displayName: true } } } },
        userB: { include: { profile: { select: { displayName: true } } } },
      },
    });
    if (!match) throw new NotFoundException('match_not_found');
    if (match.userAId !== userId && match.userBId !== userId) throw new ForbiddenException();
    if (match.status !== 'ACTIVE') throw new BadRequestException('connection_ended');
    const other = match.userAId === userId ? match.userB : match.userA;
    const me = match.userAId === userId ? match.userA : match.userB;
    return { match, other, me };
  }

  async list(matchId: string, userId: string): Promise<VideoCallsResponse> {
    await this.assertMember(matchId, userId);
    const since = new Date(Date.now() - 24 * 3600_000);
    const rows = await this.prisma.videoCall.findMany({
      where: { matchId, status: 'SCHEDULED', scheduledAt: { gte: since } },
      orderBy: { scheduledAt: 'asc' },
      take: 10,
    });
    return {
      available: this.available,
      calls: rows.map((row) => this.describe(row, userId)),
    };
  }

  async schedule(matchId: string, userId: string, scheduledAt: Date): Promise<VideoCallItem> {
    if (!this.available) throw new BadRequestException('video_unavailable');
    const { other, me } = await this.assertMember(matchId, userId);
    if (scheduledAt.getTime() < Date.now() - 5 * 60_000) {
      throw new BadRequestException('call_in_past');
    }
    if (scheduledAt.getTime() > Date.now() + 30 * 86_400_000) {
      throw new BadRequestException('call_too_far');
    }
    const open = await this.prisma.videoCall.count({
      where: { matchId, status: 'SCHEDULED', scheduledAt: { gte: new Date() } },
    });
    if (open >= 3) throw new BadRequestException('too_many_calls');

    const row = await this.prisma.videoCall.create({
      data: { matchId, createdById: userId, scheduledAt, provider: this.provider.name },
    });
    await this.notifications.notify(
      other.id,
      'CONNECTION',
      `${me.profile?.displayName ?? 'Tu conexión'} propuso una videollamada`,
      `${formatWhen(scheduledAt)} · 15 minutos, dentro de Yugo.`,
      { matchId, callId: row.id },
    );
    return this.describe(row, userId);
  }

  async join(callId: string, userId: string) {
    const row = await this.prisma.videoCall.findUnique({ where: { id: callId } });
    if (!row || row.status !== 'SCHEDULED') throw new NotFoundException('call_not_found');
    const { me } = await this.assertMember(row.matchId, userId);
    if (!isJoinable(row.scheduledAt, row.durationMin)) {
      throw new BadRequestException('call_not_open');
    }
    const { closesAt } = joinWindow(row.scheduledAt, row.durationMin);

    let roomUrl = row.roomUrl;
    let roomName = row.roomName;
    if (!roomUrl) {
      roomName = `yugo-${row.id}`;
      const room = await this.provider.createRoom(roomName, closesAt);
      roomUrl = room.url;
      await this.prisma.videoCall.update({
        where: { id: row.id },
        data: { roomUrl, roomName },
      });
    }
    const token = await this.provider.meetingToken(
      roomName as string,
      me.profile?.displayName ?? 'Miembro',
      closesAt,
    );
    return {
      url: token ? `${roomUrl}?t=${encodeURIComponent(token)}` : roomUrl,
      expiresAt: closesAt.toISOString(),
    };
  }

  async cancel(callId: string, userId: string) {
    const row = await this.prisma.videoCall.findUnique({ where: { id: callId } });
    if (!row || row.status !== 'SCHEDULED') throw new NotFoundException('call_not_found');
    const { other, me } = await this.assertMember(row.matchId, userId);
    await this.prisma.videoCall.update({ where: { id: callId }, data: { status: 'CANCELLED' } });
    await this.notifications.notify(
      other.id,
      'CONNECTION',
      'Videollamada cancelada',
      `${me.profile?.displayName ?? 'Tu conexión'} canceló la videollamada de ${formatWhen(row.scheduledAt)}.`,
      { matchId: row.matchId },
    );
    return { cancelled: true };
  }

  private describe(
    row: {
      id: string;
      matchId: string;
      scheduledAt: Date;
      durationMin: number;
      status: string;
      createdById: string;
    },
    userId: string,
  ): VideoCallItem {
    return {
      id: row.id,
      matchId: row.matchId,
      scheduledAt: row.scheduledAt.toISOString(),
      durationMin: row.durationMin,
      status: row.status as VideoCallItem['status'],
      mine: row.createdById === userId,
      joinable: isJoinable(row.scheduledAt, row.durationMin),
    };
  }
}

function formatWhen(date: Date) {
  return new Intl.DateTimeFormat('es-DO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: process.env.APP_TIMEZONE ?? 'America/Santo_Domingo',
  }).format(date);
}
