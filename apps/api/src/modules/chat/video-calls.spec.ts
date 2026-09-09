import { BadRequestException } from '@nestjs/common';
import { DailyProvider, StubProvider, isJoinable, joinWindow } from './video-calls.service';

/**
 * Videollamada dentro de la app (RF-CON-12).
 *
 * Lo que protegen: la ventana de entrada (10 minutos antes, hasta 15 después
 * del fin), que el proveedor Daily pide salas privadas de dos personas que
 * caducan solas, y que sin clave la función se declara no disponible en vez
 * de crear una sala pública por accidente.
 */
describe('ventana de entrada', () => {
  const at = new Date('2026-09-12T20:00:00Z');

  it('abre 10 minutos antes y cierra 15 minutos después del fin', () => {
    const { opensAt, closesAt } = joinWindow(at, 15);
    expect(opensAt.toISOString()).toBe('2026-09-12T19:50:00.000Z');
    expect(closesAt.toISOString()).toBe('2026-09-12T20:30:00.000Z');
  });

  it('no deja entrar antes ni después', () => {
    expect(isJoinable(at, 15, new Date('2026-09-12T19:40:00Z'))).toBe(false);
    expect(isJoinable(at, 15, new Date('2026-09-12T19:55:00Z'))).toBe(true);
    expect(isJoinable(at, 15, new Date('2026-09-12T20:29:00Z'))).toBe(true);
    expect(isJoinable(at, 15, new Date('2026-09-12T20:31:00Z'))).toBe(false);
  });
});

describe('proveedores', () => {
  it('Daily crea salas privadas de dos personas que caducan solas', async () => {
    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(String(init.body)) });
      return new Response(
        JSON.stringify(
          url.endsWith('/rooms') ? { url: 'https://yugo.daily.co/yugo-1' } : { token: 't0k' },
        ),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as unknown as typeof fetch;
    const provider = new DailyProvider('key', fetchImpl);
    expect(provider.configured).toBe(true);

    const expiresAt = new Date('2026-09-12T20:30:00Z');
    const room = await provider.createRoom('yugo-1', expiresAt);
    expect(room.url).toBe('https://yugo.daily.co/yugo-1');
    const props = calls[0].body.properties as Record<string, unknown>;
    expect(calls[0].body.privacy).toBe('private');
    expect(props.max_participants).toBe(2);
    expect(props.exp).toBe(Math.floor(expiresAt.getTime() / 1000));
    expect(props.eject_at_room_exp).toBe(true);

    const token = await provider.meetingToken('yugo-1', 'Samuel', expiresAt);
    expect(token).toBe('t0k');
    expect(calls[1].url).toContain('/meeting-tokens');
  });

  it('sin clave, Daily no está configurado y el stub rechaza crear salas', async () => {
    expect(new DailyProvider('').configured).toBe(false);
    const stub = new StubProvider();
    expect(stub.configured).toBe(false);
    await expect(stub.createRoom()).rejects.toBeInstanceOf(BadRequestException);
    expect(await stub.meetingToken()).toBeNull();
  });
});
