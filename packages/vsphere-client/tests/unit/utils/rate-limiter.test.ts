import { describe, it, expect, afterEach } from 'vitest';
import { TokenBucketRateLimiter } from '../../../src/utils/rate-limiter.js';

describe('TokenBucketRateLimiter', () => {
  let limiter: TokenBucketRateLimiter;

  afterEach(() => {
    limiter?.destroy();
  });

  it('should allow immediate calls within limit', async () => {
    limiter = new TokenBucketRateLimiter(10);
    const start = Date.now();

    for (let i = 0; i < 10; i++) {
      await limiter.acquire();
    }

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(100);
  });

  it('should throttle calls beyond limit', async () => {
    limiter = new TokenBucketRateLimiter(2);

    await limiter.acquire();
    await limiter.acquire();

    // Third call should be delayed
    const start = Date.now();
    await limiter.acquire();
    const elapsed = Date.now() - start;

    // Should wait at least some time (the refill interval)
    expect(elapsed).toBeGreaterThanOrEqual(50);
  });
});
