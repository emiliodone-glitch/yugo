/**
 * Live chat transport (RF-CON-03).
 *
 * The API has had a Socket.IO gateway from the start; nothing ever connected
 * to it, so messages only appeared on a reload. This is the missing half: one
 * shared connection per app, rooms per conversation, and the three events the
 * gateway speaks — `message:new`, `messages:read` and `typing`.
 *
 * Persistence and moderation stay on HTTP. The socket only carries what has
 * already been decided, so a dropped connection degrades to the old behaviour
 * (see it on the next fetch) instead of losing or leaking a message.
 */
import { io, type Socket } from 'socket.io-client';
import type { ChatMessage } from '@yugo/shared';
import { api, isDemoMode } from './runtime';

export interface RealtimeHandlers {
  onMessage?: (message: ChatMessage) => void;
  onRead?: (readerId: string) => void;
  onTyping?: (userId: string, typing: boolean) => void;
}

let socket: Socket | null = null;
let connecting: Promise<Socket | null> | null = null;

/** Base URL of the /chat namespace, derived from the API base. */
function chatUrl(): string {
  // The client's baseUrl ends in /v1; the gateway lives at the server root.
  return api().http.baseUrl.replace(/\/v1$/, '') + '/chat';
}

/**
 * The shared connection, created on first use. Concurrent callers share one
 * in-flight attempt so opening two conversations does not open two sockets.
 */
async function ensureSocket(): Promise<Socket | null> {
  if (isDemoMode()) return null;
  if (socket?.connected) return socket;
  if (connecting) return connecting;

  connecting = (async () => {
    const tokens = await api().http.currentTokens();
    if (!tokens?.accessToken) return null;

    socket?.disconnect();
    socket = io(chatUrl(), {
      transports: ['websocket'],
      auth: { token: tokens.accessToken },
      // The gateway drops an unauthenticated socket, and a token can expire
      // while the app sits in the background; a bounded retry reconnects with
      // whatever token is current instead of hammering the server.
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    return socket;
  })();

  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}

/**
 * Joins a conversation room and wires the handlers. Returns a cleanup that
 * removes exactly these listeners — the socket itself stays open for the other
 * conversations the member may have on screen.
 */
export async function joinConversation(
  conversationId: string,
  handlers: RealtimeHandlers,
): Promise<() => void> {
  const active = await ensureSocket();
  if (!active) return () => {};

  const onMessage = (message: ChatMessage) => {
    if (message.conversationId === conversationId) handlers.onMessage?.(message);
  };
  const onRead = (payload: { readerId: string }) => handlers.onRead?.(payload.readerId);
  const onTyping = (payload: { userId: string; typing: boolean }) =>
    handlers.onTyping?.(payload.userId, payload.typing);

  active.on('message:new', onMessage);
  active.on('messages:read', onRead);
  active.on('typing', onTyping);

  const join = () => active.emit('conversation:join', { conversationId });
  join();
  // Rooms live on the server side of a connection, so a reconnect has to
  // re-join or the member silently stops receiving messages.
  active.on('connect', join);

  return () => {
    active.off('message:new', onMessage);
    active.off('messages:read', onRead);
    active.off('typing', onTyping);
    active.off('connect', join);
  };
}

/** Tells the other person we are writing. Best effort: never awaited. */
export function emitTyping(conversationId: string, typing: boolean): void {
  socket?.emit('typing', { conversationId, typing });
}

/** Drops the shared connection — used when the session ends. */
export function disconnectRealtime(): void {
  socket?.disconnect();
  socket = null;
}
