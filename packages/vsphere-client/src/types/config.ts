/** Minimal logger interface compatible with console, pino, winston, etc. */
export interface Logger {
  debug(msg: string, ...args: unknown[]): void;
  info(msg: string, ...args: unknown[]): void;
  warn(msg: string, ...args: unknown[]): void;
  error(msg: string, ...args: unknown[]): void;
}

/** Configuration for creating a {@link VsphereClient} instance. */
export interface VsphereClientConfig {
  /** vCenter hostname or IP address. */
  host: string;
  /** SSO / vCenter username. */
  username: string;
  /** SSO / vCenter password. */
  password: string;
  /** HTTPS port. Default: `443`. */
  port?: number;
  /** Skip TLS certificate verification. Default: `false`. */
  insecure?: boolean;
  /** Custom CA certificate (PEM or DER). */
  ca?: string | Buffer;
  /** Logger instance; defaults to a silent no-op logger. */
  logger?: Logger;
  /** Interval between session keep-alive pings in ms. Default: `600_000` (10 min). */
  keepAliveIntervalMs?: number;
  /** Per-request SOAP timeout in ms. Default: `120_000` (2 min). */
  requestTimeoutMs?: number;
  /** Maximum number of concurrent SOAP requests. Default: `4`. */
  maxConcurrency?: number;
  /** Token-bucket rate limit for SOAP requests. */
  rateLimit?: { maxPerSecond: number };
}
