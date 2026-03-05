import { VsphereError, VsphereErrorCode } from '../types/errors.js';

/** Limits the number of concurrently executing async operations. */
export class ConcurrencyLimiter {
  private running = 0;
  private queue: Array<{ resolve: () => void; reject: (err: Error) => void }> = [];
  private destroyed = false;

  constructor(private readonly maxConcurrency: number) {}

  /**
   * Runs `fn` once a concurrency slot is available. Throws if the limiter has been destroyed.
   * @param fn - Async function to execute.
   */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.destroyed) {
      throw new VsphereError('Concurrency limiter destroyed', VsphereErrorCode.CONNECTION_FAILED);
    }

    if (this.running >= this.maxConcurrency) {
      await new Promise<void>((resolve, reject) => {
        this.queue.push({ resolve, reject });
      });
    }

    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      if (this.queue.length > 0) {
        const next = this.queue.shift()!;
        next.resolve();
      }
    }
  }

  /** Destroys the limiter and rejects all queued waiters. */
  destroy(): void {
    this.destroyed = true;
    const err = new VsphereError('Concurrency limiter destroyed', VsphereErrorCode.CONNECTION_FAILED);
    for (const waiter of this.queue) {
      waiter.reject(err);
    }
    this.queue = [];
  }
}
