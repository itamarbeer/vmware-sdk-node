import type { VsphereClientConfig, Logger } from '../types/config.js';
import type { ServiceContent } from '../types/models.js';
import { VsphereError, VsphereErrorCode } from '../types/errors.js';
import { noopLogger } from '../utils/logger.js';
import { SoapClient } from '../soap/soap-client.js';
import { SessionManager } from './session.js';
import { TaskEngine } from '../tasks/task-engine.js';
import { PropertyCollectorHelper } from '../inventory/property-collector.js';
import { InventoryModule } from '../inventory/inventory-module.js';
import { VmModule } from '../vm/vm-module.js';
import { SnapshotModule } from '../snapshots/snapshot-module.js';
import { EventsModule } from '../events/events-module.js';
import { AlarmsModule } from '../alarms/alarms-module.js';
import { HealthModule } from '../health/health-module.js';

/** High-level client for the VMware vSphere SOAP API. */
export class VsphereClient {
  private readonly soap: SoapClient;
  private readonly session: SessionManager;
  private readonly logger: Logger;
  private readonly config: VsphereClientConfig;
  private connected = false;
  private connectingPromise: Promise<void> | null = null;

  private _taskEngine!: TaskEngine;
  private _inventory!: InventoryModule;
  private _vm!: VmModule;
  private _snapshots!: SnapshotModule;
  private _events!: EventsModule;
  private _alarms!: AlarmsModule;
  private _health!: HealthModule;

  constructor(config: VsphereClientConfig) {
    this.config = config;
    this.logger = config.logger ?? noopLogger;
    this.soap = new SoapClient(config);
    this.session = new SessionManager(this.soap, config, this.logger);
  }

  /**
   * Creates a new client and connects in one step.
   * @param config - Connection and authentication settings.
   */
  static async connect(config: VsphereClientConfig): Promise<VsphereClient> {
    const client = new VsphereClient(config);
    await client.connect();
    return client;
  }

  /** Establishes a SOAP session and authenticates with vCenter. Throws {@link VsphereErrorCode.CONNECTION_FAILED} if already connected. */
  async connect(): Promise<void> {
    if (this.connected) {
      throw new VsphereError('Already connected', VsphereErrorCode.CONNECTION_FAILED);
    }

    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    this.connectingPromise = this.doConnect();
    try {
      await this.connectingPromise;
    } finally {
      this.connectingPromise = null;
    }
  }

  private async doConnect(): Promise<void> {
    await this.soap.connect();
    try {
      const sc = await this.session.login();
      this.initModules(sc);
      this.session.startKeepAlive();
      this.connected = true;

      this.logger.info(
        `Connected to ${sc.aboutInfo.fullName} (API ${sc.aboutInfo.apiVersion})`,
      );
    } catch (err) {
      await this.soap.destroy();
      throw err;
    }
  }

  /** Logs out of the vSphere session and closes the underlying connection. */
  async disconnect(): Promise<void> {
    if (!this.connected) return;

    this.session.stopKeepAlive();
    try {
      await this.session.logout();
    } finally {
      await this.soap.destroy();
      this.connected = false;
      this.logger.info('Disconnected');
    }
  }

  /** Inventory queries (VMs, hosts, clusters, datacenters, datastores). */
  get inventory(): InventoryModule {
    this.ensureConnected();
    return this._inventory;
  }

  /** VM power operations and reconfiguration. */
  get vm(): VmModule {
    this.ensureConnected();
    return this._vm;
  }

  /** Snapshot create, list, revert, and remove operations. */
  get snapshots(): SnapshotModule {
    this.ensureConnected();
    return this._snapshots;
  }

  /** Event history queries. */
  get events(): EventsModule {
    this.ensureConnected();
    return this._events;
  }

  /** Alarm listing and acknowledgement. */
  get alarms(): AlarmsModule {
    this.ensureConnected();
    return this._alarms;
  }

  /** Health monitoring and recent error aggregation. */
  get health(): HealthModule {
    this.ensureConnected();
    return this._health;
  }

  /** Raw vCenter ServiceContent returned at login. */
  get serviceContent(): ServiceContent {
    this.ensureConnected();
    return this.session.serviceContent;
  }

  /**
   * Sends a raw SOAP method call to vCenter.
   * @internal
   * @param method - SOAP operation name.
   * @param args - Method arguments.
   */
  call<T>(method: string, args: Record<string, unknown>): Promise<T> {
    this.ensureConnected();
    return this.soap.call<T>(method, args);
  }

  private initModules(sc: ServiceContent): void {
    const callFn = <T>(method: string, args: Record<string, unknown>) =>
      this.soap.call<T>(method, args);

    this._taskEngine = new TaskEngine(callFn, this.logger);
    this._taskEngine.setPropertyCollector(sc.propertyCollector);

    const pc = new PropertyCollectorHelper(
      callFn,
      sc.propertyCollector,
      sc.rootFolder,
      this.logger,
    );
    pc.setViewManager(sc.viewManager);

    this._inventory = new InventoryModule(pc, this.logger);
    this._vm = new VmModule(callFn, this._taskEngine, this.logger);
    this._snapshots = new SnapshotModule(callFn, this._taskEngine, pc, this.logger);
    this._events = new EventsModule(callFn, sc.eventManager, this.logger);
    this._alarms = new AlarmsModule(callFn, sc.alarmManager, pc, sc.rootFolder, this.logger);
    this._health = new HealthModule(callFn, this._events, this.logger);
  }

  private ensureConnected(): void {
    if (!this.connected) {
      throw new VsphereError(
        'Client is not connected. Call connect() first.',
        VsphereErrorCode.CONNECTION_FAILED,
      );
    }
  }
}
