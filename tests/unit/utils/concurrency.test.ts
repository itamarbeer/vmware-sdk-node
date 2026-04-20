import { describe, it, expect } from 'vitest';
import { ConcurrencyLimiter } from '../../../src/utils/concurrency.js';

describe('ConcurrencyLimiter', () => {
  it('should limit concurrent executions', async () => {
    const limiter = new ConcurrencyLimiter(2);
    let running = 0;
    let maxRunning = 0;

    const task = () =>
      limiter.run(async () => {
        running++;
        maxRunning = Math.max(maxRunning, running);
        await new Promise((r) => setTimeout(r, 50));
        running--;
        return 'done';
      });

    const results = await Promise.all([task(), task(), task(), task()]);

    expect(maxRunning).toBeLessThanOrEqual(2);
    expect(results).toEqual(['done', 'done', 'done', 'done']);
  });

  it('should handle errors without blocking queue', async () => {
    const limiter = new ConcurrencyLimiter(1);

    await expect(
      limiter.run(async () => {
        throw new Error('fail');
      }),
    ).rejects.toThrow('fail');

    // Next call should still work
    const result = await limiter.run(async () => 'ok');
    expect(result).toBe('ok');
  });
});
