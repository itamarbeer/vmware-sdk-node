import { describe, it, expect } from 'vitest';
import { ConcurrencyLimiter } from '../../../src/utils/concurrency.js';
import { VsphereError } from '../../../src/types/errors.js';

describe('ConcurrencyLimiter destroy', () => {
  it('should reject queued promises on destroy', async () => {
    const limiter = new ConcurrencyLimiter(1);

    // Fill the one slot
    const blocking = limiter.run(() => new Promise<string>((resolve) => {
      setTimeout(() => resolve('done'), 1000);
    }));

    // This will queue since concurrency is 1
    const pendingPromise = limiter.run(async () => 'queued');

    // Destroy should reject the queued promise
    limiter.destroy();

    await expect(pendingPromise).rejects.toThrow(VsphereError);
  });

  it('should throw on run after destroy', async () => {
    const limiter = new ConcurrencyLimiter(1);
    limiter.destroy();

    await expect(limiter.run(async () => 'test')).rejects.toThrow(VsphereError);
  });
});
