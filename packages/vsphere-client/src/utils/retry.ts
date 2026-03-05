/** Configuration for exponential-backoff retry behavior. */
export interface RetryOptions {
  /** Maximum number of retry attempts (not counting the initial call). */
  maxRetries: number;
  /** Base delay in ms before the first retry. */
  baseDelayMs: number;
  /** Maximum delay cap in ms. */
  maxDelayMs: number;
  /** Predicate to determine if an error is retryable; non-retryable errors bail immediately. */
  retryableCheck?: (err: unknown) => boolean;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executes `fn` with exponential backoff and jitter on failure.
 * @param fn - Async function to execute.
 * @param opts - Retry configuration overrides.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: Partial<RetryOptions> = {},
): Promise<T> {
  const options = { ...DEFAULT_OPTIONS, ...opts };
  let lastError: unknown;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === options.maxRetries) break;
      if (options.retryableCheck && !options.retryableCheck(err)) break;

      const delay = Math.min(
        options.maxDelayMs,
        options.baseDelayMs * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5),
      );
      await sleep(delay);
    }
  }

  throw lastError;
}
