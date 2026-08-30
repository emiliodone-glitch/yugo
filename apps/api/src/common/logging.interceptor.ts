import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable, tap } from 'rxjs';

/**
 * Structured request logs (RNF-08): one JSON line per request with a
 * correlation id, latency and the acting user, so logs can be shipped to a
 * central collector and alerted on. Never logs bodies — they may carry
 * personal data or private messages (RF-SEG-08).
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('http');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest();
    if (!request?.method) return next.handle();

    const requestId = request.headers['x-request-id'] ?? randomUUID();
    request.requestId = requestId;
    http.getResponse()?.setHeader?.('x-request-id', requestId);

    const startedAt = process.hrtime.bigint();
    const record = (status: number, error?: string) => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      const line = JSON.stringify({
        requestId,
        method: request.method,
        route: request.route?.path ?? request.url?.split('?')[0],
        status,
        durationMs: Math.round(durationMs * 10) / 10,
        userId: request.user?.id ?? null,
        role: request.user?.role ?? null,
        ...(error ? { error } : {}),
      });
      // Slow reads are the ones RNF-02 cares about (p95 < 400 ms).
      if (error || status >= 500) this.logger.error(line);
      else if (durationMs > 400) this.logger.warn(line);
      else this.logger.log(line);
    };

    return next.handle().pipe(
      tap({
        next: () => record(http.getResponse()?.statusCode ?? 200),
        error: (error) => record(error?.status ?? 500, error?.message),
      }),
    );
  }
}
