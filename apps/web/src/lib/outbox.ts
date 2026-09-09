'use client';

/**
 * Cola de mensajes sin conexión (RNF-06), la misma lógica que
 * `apps/mobile/lib/outbox.ts` con `localStorage` como almacén y el cliente de
 * la API (o el almacén de la demo) como transporte.
 *
 * En un estacionamiento de iglesia la señal va y viene. Un mensaje escrito
 * sin cobertura no se pierde ni falla con un aviso rojo: se guarda aquí, se
 * ve en la conversación como «pendiente de enviar» y sale solo cuando vuelve
 * la red. Tres reglas:
 *
 * - **Uno a la vez y en orden.** Se reenvía en secuencia; si el primero falla
 *   por red, los demás esperan. Así no se duplica ni se desordena.
 * - **Un rechazo del servidor lo saca de la cola.** Un 4xx (moderación,
 *   conversación cerrada) no se reintenta: se avisa a la persona y ya.
 * - **Solo mensajes.** Nada más se reproduce al reconectar; un «me interesa»
 *   o un pago repetidos son peores que uno perdido.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '@yugo/shared';
// El mismo QueryClient que usan los hooks compartidos: importarlo de
// @tanstack directamente resolvía otra copia del paquete y el contexto no
// coincidía («No QueryClient set») al renderizar en el servidor.
import { useDemoStore, useQueryClient } from '@yugo/app-core';
import { DEMO_MODE, getApiClient } from './api';
import { useOnline } from './online';

export interface OutboxItem {
  id: string;
  conversationId: string;
  body: string;
  createdAt: string;
  /** Intentos fallidos por red, para no martillar. */
  attempts: number;
}

export interface OutboxStorage {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
}

export interface OutboxTransport {
  send(conversationId: string, body: string): Promise<unknown>;
}

const KEY = 'yugo.outbox';
const MAX_ITEMS = 50;

export interface FlushResult {
  sent: OutboxItem[];
  /** Rechazados por el servidor: se descartan y se informa. */
  rejected: Array<{ item: OutboxItem; reason: string }>;
  /** Siguen en cola porque la red volvió a fallar. */
  remaining: number;
}

/** Un fallo de red es un fallo de red; cualquier otra cosa es una respuesta. */
export function isNetworkFailure(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 0 || error.status >= 500;
  if (error instanceof TypeError) return true; // fetch: «Failed to fetch»
  const message = error instanceof Error ? error.message : String(error);
  return /network|timeout|failed to fetch|econn|offline|unreachable/i.test(message);
}

export class Outbox {
  private listeners = new Set<() => void>();
  private flushing: Promise<FlushResult> | null = null;

  constructor(
    private readonly storage: OutboxStorage,
    private readonly transport: OutboxTransport,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(conversationId?: string): Promise<OutboxItem[]> {
    const items = await this.read();
    return conversationId ? items.filter((i) => i.conversationId === conversationId) : items;
  }

  async enqueue(conversationId: string, body: string): Promise<OutboxItem> {
    const items = await this.read();
    const item: OutboxItem = {
      id: `out-${this.now().getTime()}-${Math.random().toString(36).slice(2, 8)}`,
      conversationId,
      body,
      createdAt: this.now().toISOString(),
      attempts: 0,
    };
    // La cola tiene tope: si alguien escribe cincuenta mensajes sin señal, los
    // más viejos ya no tienen sentido cuando vuelva.
    const next = [...items, item].slice(-MAX_ITEMS);
    await this.write(next);
    return item;
  }

  async remove(id: string): Promise<void> {
    const items = await this.read();
    await this.write(items.filter((i) => i.id !== id));
  }

  /** Reenvía en orden. Concurrente-seguro: una segunda llamada espera la primera. */
  flush(): Promise<FlushResult> {
    if (this.flushing) return this.flushing;
    this.flushing = this.doFlush().finally(() => {
      this.flushing = null;
    });
    return this.flushing;
  }

  private async doFlush(): Promise<FlushResult> {
    const result: FlushResult = { sent: [], rejected: [], remaining: 0 };
    let items = await this.read();
    for (const item of [...items]) {
      try {
        await this.transport.send(item.conversationId, item.body);
        items = items.filter((i) => i.id !== item.id);
        result.sent.push(item);
      } catch (error) {
        if (isNetworkFailure(error)) {
          // La red volvió a irse: lo que queda espera al próximo intento.
          items = items.map((i) => (i.id === item.id ? { ...i, attempts: i.attempts + 1 } : i));
          break;
        }
        items = items.filter((i) => i.id !== item.id);
        result.rejected.push({
          item,
          reason: error instanceof Error ? error.message : 'rejected',
        });
      }
    }
    await this.write(items);
    result.remaining = items.length;
    return result;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async read(): Promise<OutboxItem[]> {
    try {
      const raw = await this.storage.getItem(KEY);
      const parsed = raw ? (JSON.parse(raw) as OutboxItem[]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private async write(items: OutboxItem[]): Promise<void> {
    try {
      await this.storage.setItem(KEY, JSON.stringify(items));
    } catch {
      // Sin almacenamiento la cola vive solo en esta sesión; peor es perder el mensaje.
    }
    this.listeners.forEach((listener) => listener());
  }
}

// ---------------------------------------------------------------------------
// La cola de esta pestaña
// ---------------------------------------------------------------------------

/** `localStorage` si existe; si el navegador lo bloquea, memoria. */
const browserStorage: OutboxStorage = (() => {
  let memory: string | null = null;
  return {
    getItem: (key) => {
      try {
        return window.localStorage.getItem(key) ?? memory;
      } catch {
        return memory;
      }
    },
    setItem: (key, value) => {
      memory = value;
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // solo memoria
      }
    },
  };
})();

/**
 * Sin red el navegador no llega ni al almacén de la demo: aquí la demo también
 * espera a la señal, para que el flujo se vea igual que en producción.
 */
const transport: OutboxTransport = {
  send: async (conversationId, body) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new TypeError('offline');
    }
    if (DEMO_MODE) return useDemoStore.getState().sendMessage(conversationId, body);
    return getApiClient().connections.send(conversationId, body);
  },
};

let shared: Outbox | null = null;

export function getOutbox(): Outbox {
  if (!shared) shared = new Outbox(browserStorage, transport);
  return shared;
}

/**
 * Lo pendiente de una conversación y las acciones sobre la cola. Reintenta
 * solo cuando vuelve la red (y al montar, por si quedó algo de otra visita);
 * al enviar, refresca la conversación para que la burbuja pendiente pase a
 * ser un mensaje de verdad.
 */
export function useOutbox(conversationId: string, onFlushed?: (result: FlushResult) => void) {
  const online = useOnline();
  const queryClient = useQueryClient();
  const outbox = useMemo(() => getOutbox(), []);
  const [pending, setPending] = useState<OutboxItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      void outbox.list(conversationId).then((items) => {
        if (!cancelled) setPending(items);
      });
    };
    refresh();
    const unsubscribe = outbox.subscribe(refresh);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [outbox, conversationId]);

  const flush = useCallback(async () => {
    const result = await outbox.flush();
    if (result.sent.length > 0 || result.rejected.length > 0) {
      const touched = new Set(
        [...result.sent, ...result.rejected.map((r) => r.item)].map((i) => i.conversationId),
      );
      for (const id of touched) {
        void queryClient.invalidateQueries({ queryKey: ['messages', id] });
      }
      void queryClient.invalidateQueries({ queryKey: ['connections'] });
      onFlushed?.(result);
    }
    return result;
  }, [outbox, queryClient, onFlushed]);

  useEffect(() => {
    if (!online) return;
    void flush();
  }, [online, flush]);

  const enqueue = useCallback(
    (body: string) => outbox.enqueue(conversationId, body),
    [outbox, conversationId],
  );

  return { pending, enqueue, flush, online };
}
