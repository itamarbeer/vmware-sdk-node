import { VsphereError, VsphereErrorCode } from '../types/errors.js';

/** Token-bucket rate limiter that throttles concurrent operations to a maximum rate per second. */
export class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;
  private waitQueue: Array<{ resolve: () => void; reject: (err: Error) => void }> = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;

  /**
   * @param maxPerSecond - Maximum number of tokens (requests) allowed per second.
   */
  constructor(maxPerSecond: number) {
    this.maxTokens = maxPerSecond;
    this.tokens = maxPerSecond;
    this.refillRate = maxPerSecond;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }

  private processQueue(): void {
    this.refill();
    while (this.waitQueue.length > 0 && this.tokens >= 1) {
      this.tokens -= 1;
      const waiter = this.waitQueue.shift()!;
      waiter.resolve();
    }
    if (this.waitQueue.length === 0 && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Acquires a token, waiting if the bucket is empty. Throws if the limiter has been destroyed. */
  async acquire(): Promise<void> {
    if (this.destroyed) {
      throw new VsphereError('Rate limiter destroyed', VsphereErrorCode.CONNECTION_FAILED);
    }

    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    return new Promise<void>((resolve, reject) => {
      this.waitQueue.push({ resolve, reject });
      if (!this.timer) {
        this.timer = setInterval(() => this.processQueue(), 100);
        if (typeof this.timer.unref === 'function') {
          this.timer.unref();
        }
      }
    });
  }

  /** Destroys the limiter and rejects all queued waiters. */
  destroy(): void {
    this.destroyed = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    const err = new VsphereError('Rate limiter destroyed', VsphereErrorCode.CONNECTION_FAILED);
    for (const waiter of this.waitQueue) {
      waiter.reject(err);
    }
    this.waitQueue = [];
  }
}
