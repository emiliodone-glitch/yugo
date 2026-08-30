/**
 * Transport for the typed API client: JSON over fetch, bearer tokens with
 * transparent refresh, and domain errors that carry the API's error code so
 * the UI can react ("daily_interests_used" → paywall) instead of guessing
 * from a message string.
 */

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** Where tokens live. Web uses localStorage, mobile uses SecureStore. */
export interface TokenStorage {
  read(): Promise<TokenPair | null> | TokenPair | null;
  write(tokens: TokenPair | null): Promise<void> | void;
}

export class MemoryTokenStorage implements TokenStorage {
  private tokens: TokenPair | null = null;
  read() {
    return this.tokens;
  }
  write(tokens: TokenPair | null) {
    this.tokens = tokens;
  }
}

/** Error thrown by every client call that does not return 2xx. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    /** Domain code from the API, e.g. `daily_interests_used`. */
    readonly code: string,
    /** Field-level issues from zod validation, when present. */
    readonly issues?: Array<{ path: string; message: string }>,
    /** Anything else the endpoint returned. */
    readonly details?: Record<string, unknown>,
  ) {
    super(code);
    this.name = 'ApiError';
  }

  /** The member must accept the new covenant version (RF-SEG-01). */
  get needsCovenant(): boolean {
    return this.code === 'covenant_acceptance_required';
  }

  /** The free daily interest allowance is spent (RF-DES-05) → paywall. */
  get needsUpgrade(): boolean {
    return (
      this.code === 'daily_interests_used' ||
      this.code === 'plus_required' ||
      this.code === 'oro_required' ||
      this.code === 'interest_message_requires_plus'
    );
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }
}

export interface HttpClientOptions {
  baseUrl: string;
  storage?: TokenStorage;
  /** Called when the refresh token is rejected, so the app can sign out. */
  onSignOut?: () => void;
  /** Injected in tests. */
  fetchImpl?: typeof fetch;
}

interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  /** Skips the Authorization header (public endpoints). */
  anonymous?: boolean;
  /** Returns the raw text instead of parsing JSON (.ics, .csv). */
  raw?: boolean;
}

export class HttpClient {
  readonly baseUrl: string;
  readonly storage: TokenStorage;
  private readonly fetchImpl: typeof fetch;
  private readonly onSignOut?: () => void;
  /** In-flight refresh, shared so parallel 401s trigger a single refresh. */
  private refreshing: Promise<TokenPair | null> | null = null;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.storage = options.storage ?? new MemoryTokenStorage();
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.onSignOut = options.onSignOut;
  }

  async setTokens(tokens: TokenPair | null): Promise<void> {
    await this.storage.write(tokens);
  }

  async currentTokens(): Promise<TokenPair | null> {
    return (await this.storage.read()) ?? null;
  }

  async isAuthenticated(): Promise<boolean> {
    return (await this.currentTokens()) !== null;
  }

  private buildUrl(path: string, query?: RequestOptions['query']): string {
    const url = new URL(`${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    return url.toString();
  }

  private async parseError(response: Response): Promise<ApiError> {
    let payload: Record<string, unknown> = {};
    try {
      payload = (await response.json()) as Record<string, unknown>;
    } catch {
      // Non-JSON error (proxy, gateway): fall through with the status only.
    }
    const message = payload.message;
    const code =
      typeof message === 'string'
        ? message
        : Array.isArray(message)
          ? String(message[0])
          : `http_${response.status}`;
    return new ApiError(
      response.status,
      code,
      payload.issues as ApiError['issues'],
      payload,
    );
  }

  /** Refreshes the pair once, sharing the promise across concurrent calls. */
  private async refresh(): Promise<TokenPair | null> {
    if (this.refreshing) return this.refreshing;

    this.refreshing = (async () => {
      const tokens = await this.currentTokens();
      if (!tokens?.refreshToken) return null;
      try {
        const response = await this.fetchImpl(this.buildUrl('/auth/refresh'), {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        });
        if (!response.ok) throw await this.parseError(response);
        const next = (await response.json()) as TokenPair;
        await this.storage.write(next);
        return next;
      } catch {
        await this.storage.write(null);
        this.onSignOut?.();
        return null;
      } finally {
        this.refreshing = null;
      }
    })();

    return this.refreshing;
  }

  async request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
    const send = async (accessToken?: string): Promise<Response> => {
      const headers: Record<string, string> = { accept: 'application/json' };
      if (options.body !== undefined) headers['content-type'] = 'application/json';
      if (accessToken) headers.authorization = `Bearer ${accessToken}`;
      return this.fetchImpl(this.buildUrl(path, options.query), {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
    };

    const tokens = options.anonymous ? null : await this.currentTokens();
    let response = await send(tokens?.accessToken);

    // A 401 on an authenticated call means the access token expired: refresh
    // once and replay. If the refresh fails the caller gets the 401.
    if (response.status === 401 && !options.anonymous && tokens?.refreshToken) {
      const refreshed = await this.refresh();
      if (refreshed) response = await send(refreshed.accessToken);
    }

    if (!response.ok) throw await this.parseError(response);
    if (response.status === 204) return undefined as T;
    if (options.raw) return (await response.text()) as T;

    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  get<T>(path: string, options?: Omit<RequestOptions, 'body'>) {
    return this.request<T>('GET', path, options);
  }
  post<T>(path: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>('POST', path, { ...options, body });
  }
  put<T>(path: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>('PUT', path, { ...options, body });
  }
  delete<T>(path: string, options?: RequestOptions) {
    return this.request<T>('DELETE', path, options);
  }

  /** Absolute URL for links the browser follows directly (.ics, .csv). */
  url(path: string, query?: RequestOptions['query']): string {
    return this.buildUrl(path, query);
  }
}
