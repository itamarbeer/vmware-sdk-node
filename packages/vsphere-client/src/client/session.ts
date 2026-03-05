import type { MoRef } from '../types/mo-ref.js';
import { SERVICE_INSTANCE } from '../types/mo-ref.js';
import type { Logger, VsphereClientConfig } from '../types/config.js';
import type { ServiceContent } from '../types/models.js';
import { VsphereError, VsphereErrorCode } from '../types/errors.js';
import type { SoapClient } from '../soap/soap-client.js';
import { toMoRef, toString } from '../mappers/common.js';

export class SessionManager {
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private _serviceContent: ServiceContent | null = null;
  private sessionManagerRef: MoRef | null = null;

  constructor(
    private readonly soap: SoapClient,
    private readonly config: VsphereClientConfig,
    private readonly logger: Logger,
  ) {}

  get serviceContent(): ServiceContent {
    if (!this._serviceContent) {
      throw new VsphereError('Not connected', VsphereErrorCode.CONNECTION_FAILED);
    }
    return this._serviceContent;
  }

  async login(): Promise<ServiceContent> {
    this.logger.info(`Logging in to ${this.config.host}`);

    // Step 1: Retrieve ServiceContent
    const scResponse = await this.soap.call<Record<string, unknown>>(
      'RetrieveServiceContent',
      { _this: SERVICE_INSTANCE },
    );

    const sc = (scResponse as Record<string, unknown>).returnval ?? scResponse;
    this._serviceContent = this.parseServiceContent(sc as Record<string, unknown>);
    this.sessionManagerRef = this._serviceContent.sessionManager;

    // Step 2: Login
    try {
      await this.soap.call<Record<string, unknown>>('Login', {
        _this: this.sessionManagerRef,
        userName: this.config.username,
        password: this.config.password,
        locale: 'en',
      });

      // The login response itself may contain session cookie info
      // The SoapClient intercepts Set-Cookie headers automatically
      this.logger.info(`Successfully logged in to ${this.config.host}`);

      return this._serviceContent;
    } catch (err) {
      if (err instanceof VsphereError && err.code === VsphereErrorCode.AUTH_FAILED) {
        throw err;
      }
      throw new VsphereError(
        `Login failed for ${this.config.host}`,
        VsphereErrorCode.AUTH_FAILED,
        { cause: err instanceof Error ? err : undefined },
      );
    }
  }

  async logout(): Promise<void> {
    if (!this.sessionManagerRef) return;

    this.logger.info('Logging out');
    try {
      await this.soap.call('Logout', { _this: this.sessionManagerRef });
    } catch {
      this.logger.warn('Logout call failed (session may already be expired)');
    }
    this.soap.clearSessionCookie();
  }

  startKeepAlive(): void {
    if (this.keepAliveTimer) return;
    const interval = this.config.keepAliveIntervalMs ?? 600_000;
    this.logger.debug(`Starting keep-alive every ${interval}ms`);

    this.keepAliveTimer = setInterval(async () => {
      try {
        await this.soap.call('CurrentTime', { _this: SERVICE_INSTANCE });
        this.logger.debug('Keep-alive ping successful');
      } catch (err) {
        this.logger.warn(`Keep-alive failed: ${err}`);
      }
    }, interval);

    // Unref so it doesn't prevent Node.js from exiting
    if (this.keepAliveTimer && typeof this.keepAliveTimer.unref === 'function') {
      this.keepAliveTimer.unref();
    }
  }

  stopKeepAlive(): void {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
      this.logger.debug('Keep-alive stopped');
    }
  }

  private parseServiceContent(raw: Record<string, unknown>): ServiceContent {
    const aboutInfo = raw.about as Record<string, unknown> | undefined;

    return {
      rootFolder: toMoRef(raw.rootFolder),
      propertyCollector: toMoRef(raw.propertyCollector),
      viewManager: toMoRef(raw.viewManager),
      searchIndex: toMoRef(raw.searchIndex),
      sessionManager: toMoRef(raw.sessionManager),
      eventManager: toMoRef(raw.eventManager),
      alarmManager: toMoRef(raw.alarmManager),
      taskManager: toMoRef(raw.taskManager),
      perfManager: toMoRef(raw.perfManager),
      aboutInfo: {
        name: toString(aboutInfo?.name),
        fullName: toString(aboutInfo?.fullName),
        version: toString(aboutInfo?.version),
        build: toString(aboutInfo?.build),
        apiVersion: toString(aboutInfo?.apiVersion),
      },
    };
  }
}
