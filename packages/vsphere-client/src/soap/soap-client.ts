import * as soap from 'soap';
import https from 'node:https';
import type { Logger, VsphereClientConfig } from '../types/config.js';
import { VsphereError, VsphereErrorCode } from '../types/errors.js';
import { noopLogger } from '../utils/logger.js';
import { TokenBucketRateLimiter } from '../utils/rate-limiter.js';
import { ConcurrencyLimiter } from '../utils/concurrency.js';
import { wrapSoapFault } from './fault-handler.js';
import { prepareSoapArgs } from '../mappers/common.js';

export class SoapClient {
  private client: soap.Client | null = null;
  private sessionCookie: string | null = null;
  private readonly logger: Logger;
  private readonly rateLimiter: TokenBucketRateLimiter | null;
  private readonly concurrencyLimiter: ConcurrencyLimiter;
  private readonly config: VsphereClientConfig;
  private httpsAgent: https.Agent | null = null;
  private readonly responseHandler = (_body: unknown, response: { headers?: Record<string, unknown> }) => {
    if (response?.headers) {
      this.captureSessionCookie(response.headers);
    }
  };

  constructor(config: VsphereClientConfig) {
    this.config = config;
    this.logger = config.logger ?? noopLogger;
    this.rateLimiter = config.rateLimit
      ? new TokenBucketRateLimiter(config.rateLimit.maxPerSecond)
      : null;
    this.concurrencyLimiter = new ConcurrencyLimiter(config.maxConcurrency ?? 4);
  }

  private get wsdlUrl(): string {
    const port = this.config.port ?? 443;
    return `https://${this.config.host}:${port}/sdk/vimService.wsdl`;
  }

  private get endpoint(): string {
    const port = this.config.port ?? 443;
    return `https://${this.config.host}:${port}/sdk`;
  }

  async connect(): Promise<void> {
    this.logger.info(`Connecting to vCenter at ${this.config.host}`);

    this.httpsAgent = new https.Agent({
      rejectUnauthorized: !this.config.insecure,
      ca: this.config.ca ? this.config.ca : undefined,
    });

    const wsdlOptions = {
      httpsAgent: this.httpsAgent,
      timeout: this.config.requestTimeoutMs ?? 60_000,
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const soapOptions: any = {
        endpoint: this.endpoint,
        wsdl_options: wsdlOptions,
      };

      this.client = await soap.createClientAsync(this.wsdlUrl, soapOptions);
      this.client.setEndpoint(this.endpoint);

      // Apply HTTPS agent to all runtime SOAP requests (not just WSDL fetch)
      if (this.httpsAgent) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.client as any).httpClient.options = {
          ...(this.client as any).httpClient?.options,
          httpsAgent: this.httpsAgent,
        };
      }

      // Listen for HTTP response headers to capture session cookies
      this.client.on('response', this.responseHandler);

      this.logger.info('SOAP client created successfully');
    } catch (err) {
      throw new VsphereError(
        `Failed to connect to vCenter at ${this.config.host}: ${err}`,
        VsphereErrorCode.CONNECTION_FAILED,
        { cause: err instanceof Error ? err : undefined },
      );
    }
  }

  /** @internal */
  setSessionCookie(cookie: string): void {
    this.sessionCookie = cookie;
    if (this.client) {
      this.client.addHttpHeader('Cookie', cookie);
    }
  }

  clearSessionCookie(): void {
    this.sessionCookie = null;
    if (this.client) {
      this.client.clearHttpHeaders();
    }
  }

  async call<T = unknown>(method: string, args: Record<string, unknown>): Promise<T> {
    if (!this.client) {
      throw new VsphereError('SOAP client not connected', VsphereErrorCode.CONNECTION_FAILED);
    }

    if (this.rateLimiter) {
      await this.rateLimiter.acquire();
    }

    return this.concurrencyLimiter.run(async () => {
      this.logger.debug(`SOAP call: ${method}`);

      const methodFn = (this.client as unknown as Record<string, unknown>)[method + 'Async'];
      if (typeof methodFn !== 'function') {
        throw new VsphereError(
          `Unknown SOAP method: ${method}`,
          VsphereErrorCode.SOAP_FAULT,
        );
      }

      try {
        const result = await (methodFn as (args: Record<string, unknown>) => Promise<unknown[]>).call(
          this.client,
          prepareSoapArgs(args),
        );

        // soap library returns [result, rawResponse, soapHeader, rawRequest]
        const [response] = result as [T, string, unknown, string];

        return response;
      } catch (err) {
        throw wrapSoapFault(err, { method });
      }
    });
  }

  private captureSessionCookie(headers: Record<string, unknown>): void {
    const setCookie = headers['set-cookie'] || headers['Set-Cookie'];
    if (!setCookie) return;

    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
    for (const cookie of cookies) {
      const cookieStr = String(cookie);
      if (cookieStr.includes('vmware_soap_session')) {
        const match = cookieStr.match(/vmware_soap_session=[^;]+/);
        if (match) {
          this.setSessionCookie(match[0]);
          this.logger.debug('Session cookie captured');
        }
      }
    }
  }

  async destroy(): Promise<void> {
    this.rateLimiter?.destroy();
    this.concurrencyLimiter.destroy();
    if (this.client) {
      this.client.removeListener('response', this.responseHandler);
    }
    this.client = null;
    this.sessionCookie = null;
    if (this.httpsAgent) {
      this.httpsAgent.destroy();
      this.httpsAgent = null;
    }
    this.logger.info('SOAP client destroyed');
  }

  isConnected(): boolean {
    return this.client !== null;
  }
}
