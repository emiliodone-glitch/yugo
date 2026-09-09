import { serverMessage, type ServerMessage, type ServerMessageKey } from './server-messages';

/**
 * Test double for NotificationsService. `send` resolves the catalogue in
 * Spanish and forwards to `notify`, so specs keep asserting on the text a
 * person would read (`notify.mock.calls[i][3]`) while services address
 * messages by key.
 */
export function notificationsMock() {
  const notify = jest.fn(async (..._args: unknown[]) => undefined);
  const send = jest.fn(
    async (
      userId: string,
      category: string,
      key: ServerMessageKey,
      params?: unknown,
      data?: Record<string, unknown>,
    ) => {
      const resolve = serverMessage as (
        l: 'es-DO',
        k: ServerMessageKey,
        p?: unknown,
      ) => ServerMessage;
      const { title, body } = resolve('es-DO', key, params);
      return notify(userId, category, title, body, data);
    },
  );
  return { notify, send };
}
