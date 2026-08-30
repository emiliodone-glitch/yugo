import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker, type JobsOptions } from 'bullmq';

export type QueueName = 'image-moderation' | 'push' | 'email';

export type JobHandler = (payload: Record<string, unknown>) => Promise<void>;

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: 500,
  removeOnFail: 1000,
};

/**
 * BullMQ queues for work that must not block a request: image classification,
 * push fan-out and transactional email. When Redis is unavailable (local dev,
 * unit tests) jobs run inline so behaviour stays identical — just synchronous.
 */
@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private queues = new Map<QueueName, Queue>();
  private workers: Worker[] = [];
  private handlers = new Map<QueueName, JobHandler>();
  private enabled = false;

  onModuleInit() {
    const url = process.env.REDIS_URL;
    this.enabled = !!url && process.env.NODE_ENV !== 'test';
    if (!this.enabled) {
      this.logger.warn('Queues disabled (no REDIS_URL) — jobs run inline');
    }
  }

  /** Registers the processor for a queue; called by each owning module. */
  register(name: QueueName, handler: JobHandler) {
    this.handlers.set(name, handler);
    if (!this.enabled) return;

    const connection = { url: process.env.REDIS_URL! };
    this.queues.set(name, new Queue(name, { connection, defaultJobOptions: DEFAULT_JOB_OPTIONS }));
    const worker = new Worker(
      name,
      async (job) => {
        await handler(job.data as Record<string, unknown>);
      },
      { connection, concurrency: 5 },
    );
    worker.on('failed', (job, error) =>
      this.logger.error(`job ${name}#${job?.id} failed: ${error.message}`),
    );
    this.workers.push(worker);
  }

  /**
   * Enqueues a job, or runs it inline when queues are disabled. `delayMs`
   * postpones it — used by quiet hours, which hold a push until morning
   * instead of dropping it (RF-NOT-02). Inline mode ignores the delay: there
   * is no scheduler without Redis, and a dev push arriving at once is fine.
   */
  async add(name: QueueName, payload: Record<string, unknown>, delayMs = 0): Promise<void> {
    const queue = this.queues.get(name);
    if (queue) {
      await queue.add(name, payload, delayMs > 0 ? { delay: delayMs } : undefined);
      return;
    }
    const handler = this.handlers.get(name);
    if (!handler) {
      this.logger.warn(`no handler registered for queue ${name}`);
      return;
    }
    try {
      await handler(payload);
    } catch (error) {
      this.logger.error(`inline job ${name} failed: ${String(error)}`);
    }
  }

  /** Queue depth per name — feeds the health endpoint and alerts (RNF-08). */
  async depths(): Promise<Record<string, number>> {
    const depths: Record<string, number> = {};
    for (const [name, queue] of this.queues) {
      depths[name] = await queue.getWaitingCount();
    }
    return depths;
  }

  async onModuleDestroy() {
    await Promise.all(this.workers.map((worker) => worker.close().catch(() => undefined)));
    await Promise.all([...this.queues.values()].map((queue) => queue.close().catch(() => undefined)));
  }
}
