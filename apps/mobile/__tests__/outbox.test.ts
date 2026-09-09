import { ApiError } from '@yugo/shared';
import { isNetworkFailure, Outbox, type OutboxStorage } from '../lib/outbox';

/**
 * Cola sin conexión (RNF-06). Lo que protege: un mensaje sin red se guarda y
 * se ve como pendiente; al reconectar salen en orden y de uno en uno; un
 * fallo de red a mitad deja el resto esperando sin duplicar; un rechazo del
 * servidor se descarta y se informa; y dos vaciados a la vez no mandan dos veces.
 */
function memoryStorage(): OutboxStorage & { data: Record<string, string> } {
  const data: Record<string, string> = {};
  return {
    data,
    getItem: async (key) => data[key] ?? null,
    setItem: async (key, value) => {
      data[key] = value;
    },
  };
}

describe('Outbox', () => {
  it('guarda el mensaje y lo lista por conversación', async () => {
    const outbox = new Outbox(memoryStorage(), { send: jest.fn() });
    await outbox.enqueue('conv-1', 'Hola, ¿cómo estuvo el culto?');
    await outbox.enqueue('conv-2', 'Otro');
    expect((await outbox.list('conv-1')).map((i) => i.body)).toEqual([
      'Hola, ¿cómo estuvo el culto?',
    ]);
    expect(await outbox.list()).toHaveLength(2);
  });

  it('al reconectar manda en orden y vacía la cola', async () => {
    const sent: string[] = [];
    const outbox = new Outbox(memoryStorage(), {
      send: async (_c, body) => {
        sent.push(body);
      },
    });
    await outbox.enqueue('conv-1', 'primero');
    await outbox.enqueue('conv-1', 'segundo');
    const result = await outbox.flush();
    expect(sent).toEqual(['primero', 'segundo']);
    expect(result.sent).toHaveLength(2);
    expect(result.remaining).toBe(0);
    expect(await outbox.list()).toHaveLength(0);
  });

  it('si la red se va a mitad, el resto espera y no se duplica', async () => {
    let calls = 0;
    const outbox = new Outbox(memoryStorage(), {
      send: async () => {
        calls += 1;
        if (calls === 2) throw new TypeError('Network request failed');
      },
    });
    await outbox.enqueue('conv-1', 'uno');
    await outbox.enqueue('conv-1', 'dos');
    await outbox.enqueue('conv-1', 'tres');
    const first = await outbox.flush();
    expect(first.sent.map((i) => i.body)).toEqual(['uno']);
    expect(first.remaining).toBe(2);
    const left = await outbox.list();
    expect(left.map((i) => i.body)).toEqual(['dos', 'tres']);
    expect(left[0].attempts).toBe(1);

    const second = await outbox.flush();
    expect(second.sent.map((i) => i.body)).toEqual(['dos', 'tres']);
    expect(calls).toBe(4);
  });

  it('un rechazo del servidor se descarta y se informa; no se reintenta', async () => {
    const outbox = new Outbox(memoryStorage(), {
      send: async (_c, body) => {
        if (body === 'malo') throw new ApiError(400, 'message_rejected');
      },
    });
    await outbox.enqueue('conv-1', 'malo');
    await outbox.enqueue('conv-1', 'bueno');
    const result = await outbox.flush();
    expect(result.rejected.map((r) => r.item.body)).toEqual(['malo']);
    expect(result.sent.map((i) => i.body)).toEqual(['bueno']);
    expect(result.remaining).toBe(0);
  });

  it('dos vaciados a la vez comparten el mismo envío', async () => {
    const send = jest.fn(async () => undefined);
    const outbox = new Outbox(memoryStorage(), { send });
    await outbox.enqueue('conv-1', 'x');
    await Promise.all([outbox.flush(), outbox.flush()]);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('distingue red de respuesta', () => {
    expect(isNetworkFailure(new TypeError('Network request failed'))).toBe(true);
    expect(isNetworkFailure(new ApiError(0, 'network'))).toBe(true);
    expect(isNetworkFailure(new ApiError(503, 'unavailable'))).toBe(true);
    expect(isNetworkFailure(new ApiError(400, 'message_rejected'))).toBe(false);
    expect(isNetworkFailure(new ApiError(403, 'blocked'))).toBe(false);
  });
});
