import { describe, it, expect } from 'vitest';
import { TokenBucketRateLimiter } from '../../../src/utils/rate-limiter.js';
import { VsphereError } from '../../../src/types/errors.js';

describe('TokenBucketRateLimiter destroy', () => {
  it('should reject queued promises on destroy', async () => {
    const limiter = new TokenBucketRateLimiter(1);

    // Consume the one available token
    await limiter.acquire();

    // This will queue
    const pendingPromise = limiter.acquire();

    // Destroy should reject the queued promise
    limiter.destroy();

    await expect(pendingPromise).rejects.toThrow(VsphereError);
  });

  it('should throw on acquire after destroy', async () => {
    const limiter = new TokenBucketRateLimiter(10);
    limiter.destroy();

    await expect(limiter.acquire()).rejects.toThrow(VsphereError);
  });
});
