import { describe, expect, it, vi } from 'vitest';
import { ApiError, HttpClient, MemoryTokenStorage } from './http';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('HttpClient', () => {
  it('sends the bearer token on authenticated calls', async () => {
    const storage = new MemoryTokenStorage();
    storage.write({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));

    const client = new HttpClient({ baseUrl: 'https://api.test/v1', storage, fetchImpl });
    await client.get('/discover');

    const [, init] = fetchImpl.mock.calls[0];
    expect(init.headers.authorization).toBe('Bearer access-1');
  });

  it('omits the token on public calls', async () => {
    const storage = new MemoryTokenStorage();
    storage.write({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse([]));

    const client = new HttpClient({ baseUrl: 'https://api.test/v1', storage, fetchImpl });
    await client.get('/catalog/denominations', { anonymous: true });

    const [, init] = fetchImpl.mock.calls[0];
    expect(init.headers.authorization).toBeUndefined();
  });

  it('builds the query string, skipping undefined values', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse([]));
    const client = new HttpClient({ baseUrl: 'https://api.test/v1', fetchImpl });

    await client.get('/events', { query: { type: 'VIGILIA', maxKm: 50, missing: undefined } });

    const [url] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://api.test/v1/events?type=VIGILIA&maxKm=50');
  });

  it('refreshes once on 401 and replays the request', async () => {
    const storage = new MemoryTokenStorage();
    storage.write({ accessToken: 'expired', refreshToken: 'refresh-1' });
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: 'Unauthorized' }, 401))
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'access-2', refreshToken: 'refresh-2' }))
      .mockResolvedValueOnce(jsonResponse({ items: [] }));

    const client = new HttpClient({ baseUrl: 'https://api.test/v1', storage, fetchImpl });
    const result = await client.get<{ items: unknown[] }>('/discover');

    expect(result.items).toEqual([]);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl.mock.calls[1][0]).toContain('/auth/refresh');
    // The replay carries the fresh token.
    expect(fetchImpl.mock.calls[2][1].headers.authorization).toBe('Bearer access-2');
    expect(await client.currentTokens()).toEqual({
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
    });
  });

  it('signs out when the refresh token is rejected', async () => {
    const storage = new MemoryTokenStorage();
    storage.write({ accessToken: 'expired', refreshToken: 'stale' });
    const onSignOut = vi.fn();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: 'Unauthorized' }, 401))
      .mockResolvedValueOnce(jsonResponse({ message: 'invalid_refresh_token' }, 401));

    const client = new HttpClient({ baseUrl: 'https://api.test/v1', storage, fetchImpl, onSignOut });

    await expect(client.get('/discover')).rejects.toBeInstanceOf(ApiError);
    expect(onSignOut).toHaveBeenCalled();
    expect(await client.currentTokens()).toBeNull();
  });

  it('shares one refresh across concurrent 401s', async () => {
    const storage = new MemoryTokenStorage();
    storage.write({ accessToken: 'expired', refreshToken: 'refresh-1' });
    const fetchImpl = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('/auth/refresh')) {
        return Promise.resolve(jsonResponse({ accessToken: 'access-2', refreshToken: 'refresh-2' }));
      }
      const auth = fetchImpl.mock.calls.at(-1)?.[1]?.headers?.authorization;
      return Promise.resolve(
        auth === 'Bearer access-2'
          ? jsonResponse({ ok: true })
          : jsonResponse({ message: 'Unauthorized' }, 401),
      );
    });

    const client = new HttpClient({ baseUrl: 'https://api.test/v1', storage, fetchImpl });
    await Promise.all([client.get('/discover'), client.get('/connections')]);

    const refreshCalls = fetchImpl.mock.calls.filter((call) =>
      String(call[0]).includes('/auth/refresh'),
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it('surfaces the domain code so the UI can react', async () => {
    // A Response body can only be read once, so build a fresh one per call.
    const fetchImpl = vi
      .fn()
      .mockImplementation(async () => jsonResponse({ message: 'daily_interests_used' }, 403));
    const client = new HttpClient({ baseUrl: 'https://api.test/v1', fetchImpl });

    await expect(client.post('/interests', { toUserId: 'u1' })).rejects.toMatchObject({
      status: 403,
      code: 'daily_interests_used',
    });

    const error = await client.post('/interests', { toUserId: 'u1' }).catch((e) => e as ApiError);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.needsUpgrade).toBe(true);
    expect(error.needsCovenant).toBe(false);
  });

  it('flags the covenant re-acceptance error (RF-SEG-01)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ message: 'covenant_acceptance_required', requiredVersion: '1.1' }, 403),
    );
    const client = new HttpClient({ baseUrl: 'https://api.test/v1', fetchImpl });

    try {
      await client.get('/discover');
      throw new Error('should have thrown');
    } catch (error) {
      expect((error as ApiError).needsCovenant).toBe(true);
      expect((error as ApiError).details?.requiredVersion).toBe('1.1');
    }
  });

  it('keeps zod field issues for form validation', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          message: 'validation_error',
          issues: [{ path: 'ageMax', message: 'age_range_too_narrow' }],
        },
        400,
      ),
    );
    const client = new HttpClient({ baseUrl: 'https://api.test/v1', fetchImpl });

    try {
      await client.put('/profiles/me/preferences', {});
      throw new Error('should have thrown');
    } catch (error) {
      expect((error as ApiError).issues?.[0]).toEqual({
        path: 'ageMax',
        message: 'age_range_too_narrow',
      });
    }
  });

  it('returns raw text for non-JSON downloads (.ics/.csv)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('BEGIN:VCALENDAR', { status: 200 }));
    const client = new HttpClient({ baseUrl: 'https://api.test/v1', fetchImpl });

    const ics = await client.get<string>('/events/e1/calendar.ics', { raw: true });
    expect(ics).toBe('BEGIN:VCALENDAR');
  });
});
