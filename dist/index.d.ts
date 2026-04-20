/** Minimal logger interface compatible with console, pino, winston, etc. */
interface Logger {
    debug(msg: string, ...args: unknown[]): void;
    info(msg: string, ...args: unknown[]): void;
    warn(msg: string, ...args: unknown[]): void;
    error(msg: string, ...args: unknown[]): void;
}
/** Configuration for creating a {@link VsphereClient} instance. */
interface VsphereClientConfig {
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
    rateLimit?: {
        maxPerSecond: number;
    };
}

/** vSphere Managed Object Reference — uniquely identifies a server-side object. */
interface MoRef {
    /** Managed object type (e.g. "VirtualMachine", "HostSystem"). */
    type: string;
    /** Unique identifier value on the vCenter server. */
    value: string;
}
/**
 * Creates a {@link MoRef} from a type and value pair.
 * @param type - Managed object type.
 * @param value - Managed object identifier.
 */
declare function moRef(type: string, value: string): MoRef;
/** Singleton MoRef for the vSphere ServiceInstance. */
declare const SERVICE_INSTANCE: MoRef;

/** Virtual machine power state. */
type PowerState = 'poweredOn' | 'poweredOff' | 'suspended';
/** ESXi host connection state. */
type ConnectionState = 'connected' | 'disconnected' | 'notResponding';
/** ESXi host power state. */
type HostPowerState = 'poweredOn' | 'standBy' | 'unknown';
/** vSphere task lifecycle state. */
type TaskState = 'queued' | 'running' | 'success' | 'error';
/** Alarm severity: red (critical), yellow (warning), green (ok), gray (unknown). */
type AlarmStatus = 'red' | 'yellow' | 'green' | 'gray';
/** Summary information for a virtual machine. */
interface VmSummary {
    /** VM managed object reference. */
    moRef: MoRef;
    /** Display name. */
    name: string;
    /** Current power state. */
    powerState: PowerState;
    /** Guest OS identifier (e.g. "windows9_64Guest"). */
    guestId?: string;
    /** Human-readable guest OS name. */
    guestFullName?: string;
    /** Number of virtual CPUs. */
    numCpu: number;
    /** Allocated memory in megabytes. */
    memoryMB: number;
    /** Primary IP address reported by VMware Tools. */
    ipAddress?: string;
    /** Reference to the host running this VM. */
    hostRef?: MoRef;
    /** Reference to the parent datacenter. */
    datacenterRef?: MoRef;
    /** True if this VM is a template. */
    template: boolean;
    /** BIOS UUID of the VM. */
    uuid: string;
}
/** Summary information for an ESXi host. */
interface HostSummary {
    /** Host managed object reference. */
    moRef: MoRef;
    /** Host display name. */
    name: string;
    /** Connection state to vCenter. */
    connectionState: ConnectionState;
    /** Host power state. */
    powerState: HostPowerState;
    /** CPU model string. */
    cpuModel: string;
    /** CPU speed in MHz. */
    cpuMhz: number;
    /** Total number of physical CPU cores. */
    numCpuCores: number;
    /** Total physical memory in bytes. */
    memoryBytes: number;
    /** Parent cluster or folder reference. */
    parentRef?: MoRef;
}
/** Summary information for a compute cluster. */
interface ClusterSummary {
    /** Cluster managed object reference. */
    moRef: MoRef;
    /** Cluster display name. */
    name: string;
    /** Total number of hosts in the cluster. */
    numHosts: number;
    /** Number of hosts that are powered on and not in maintenance mode. */
    numEffectiveHosts: number;
    /** Aggregate CPU resources in MHz. */
    totalCpu: number;
    /** Aggregate memory in bytes. */
    totalMemory: number;
    /** Parent folder or datacenter reference. */
    parentRef?: MoRef;
}
/** Summary information for a datacenter. */
interface DatacenterSummary {
    /** Datacenter managed object reference. */
    moRef: MoRef;
    /** Datacenter display name. */
    name: string;
}
/** Summary information for a datastore. */
interface DatastoreSummary {
    /** Datastore managed object reference. */
    moRef: MoRef;
    /** Datastore display name. */
    name: string;
    /** Filesystem type (e.g. "VMFS", "NFS", "vsan"). */
    type: string;
    /** Total capacity in bytes. */
    capacityBytes: number;
    /** Free space in bytes. */
    freeSpaceBytes: number;
    /** Whether the datastore is currently accessible. */
    accessible: boolean;
}
/** Summary information for a network. */
interface NetworkSummary {
    /** Network managed object reference. */
    moRef: MoRef;
    /** Network display name. */
    name: string;
    /** Whether the network is currently accessible. */
    accessible: boolean;
    /** Associated IP pool name, if any. */
    ipPoolName?: string;
}
/** A point-in-time snapshot of a virtual machine. */
interface Snapshot {
    /** Snapshot managed object reference. */
    moRef: MoRef;
    /** Snapshot name. */
    name: string;
    /** User-provided description. */
    description: string;
    /** When the snapshot was created. */
    createTime: Date;
    /** VM power state at snapshot creation time. */
    state: PowerState;
    /** Whether the guest filesystem was quiesced. */
    quiesced: boolean;
    /** Child snapshots in the snapshot tree. */
    children: Snapshot[];
}
/** A vSphere event record. */
interface VsphereEvent {
    /** Unique event key. */
    key: number;
    /** Event type class name. */
    eventType: string;
    /** Timestamp when the event was created. */
    createdTime: Date;
    /** Human-readable event message. */
    message: string;
    /** User who triggered the event, if applicable. */
    userName?: string;
    /** Reference to the related managed entity. */
    entityRef?: MoRef;
    /** Display name of the related entity. */
    entityName?: string;
    /** Reference to the datacenter where the event occurred. */
    datacenterRef?: MoRef;
}
/** A triggered alarm on a vSphere entity. */
interface VsphereAlarm {
    /** Alarm state managed object reference. */
    moRef: MoRef;
    /** Reference to the alarm definition. */
    alarmRef: MoRef;
    /** Reference to the entity the alarm is triggered on. */
    entityRef: MoRef;
    /** Display name of the alarmed entity. */
    entityName: string;
    /** Alarm definition name. */
    alarmName: string;
    /** Current alarm severity. */
    status: AlarmStatus;
    /** When the alarm was triggered. */
    time: Date;
    /** Whether the alarm has been acknowledged. */
    acknowledged: boolean;
}
/** Information about a vSphere task. */
interface VsphereTask {
    /** Task managed object reference. */
    moRef: MoRef;
    /** Task operation name. */
    name: string;
    /** Reference to the entity the task operates on. */
    entityRef?: MoRef;
    /** Current task state. */
    state: TaskState;
    /** Completion percentage (0-100). */
    progress?: number;
    /** When the task started executing. */
    startTime?: Date;
    /** When the task completed. */
    completeTime?: Date;
    /** Error description if the task failed. */
    errorMessage?: string;
}
/** Top-level vCenter service content returned after login. */
interface ServiceContent {
    /** Root inventory folder. */
    rootFolder: MoRef;
    /** PropertyCollector for inventory queries. */
    propertyCollector: MoRef;
    /** ViewManager for container views. */
    viewManager: MoRef;
    /** SearchIndex for lookup operations. */
    searchIndex: MoRef;
    /** SessionManager for authentication. */
    sessionManager: MoRef;
    /** EventManager for event queries. */
    eventManager: MoRef;
    /** AlarmManager for alarm operations. */
    alarmManager: MoRef;
    /** TaskManager for task tracking. */
    taskManager: MoRef;
    /** PerformanceManager for metrics. */
    perfManager: MoRef;
    /** Version and build information about the vCenter server. */
    aboutInfo: {
        name: string;
        fullName: string;
        version: string;
        build: string;
        apiVersion: string;
    };
}
/** A normalized error record from events or local error tracking. */
interface NormalizedError {
    /** When the error occurred. */
    timestamp: Date;
    /** Error severity level. */
    severity: 'error' | 'warning' | 'info';
    /** Managed object type that produced the error. */
    sourceType: string;
    /** Identifier of the source object. */
    sourceId: string;
    /** Human-readable error message. */
    message: string;
    /** Original raw event or error data. */
    raw: unknown;
}

/** Options for polling a task until completion. */
interface TaskWaitOptions {
    /** Maximum time to wait in ms. Default: `300_000` (5 min). */
    timeoutMs?: number;
    /** Polling interval in ms. Default: `2_000`. */
    pollIntervalMs?: number;
    /** Callback invoked when task progress changes. */
    onProgress?: (progress: number) => void;
}
/** Handle to a running vSphere task, providing status polling, waiting, and cancellation. */
declare class TaskHandle {
    /** Managed object reference of the task. */
    readonly moRef: MoRef;
    private _result;
    private readonly engine;
    constructor(moRef: MoRef, engine: TaskEngine);
    /** Fetches the current task state from vCenter. */
    status(): Promise<VsphereTask>;
    /**
     * Polls the task until it succeeds or fails. Throws {@link VsphereErrorCode.TASK_FAILED} on error, {@link VsphereErrorCode.TASK_TIMEOUT} on timeout.
     * @param opts - Timeout, polling interval, and progress callback.
     */
    wait(opts?: TaskWaitOptions): Promise<VsphereTask>;
    /** Requests cancellation of the task on vCenter. */
    cancel(): Promise<void>;
    /** Returns the last fetched task info, or `null` if status() has not been called. */
    get result(): VsphereTask | null;
}

/** Function signature for making SOAP calls to vCenter. */
type CallFn = <T>(method: string, args: Record<string, unknown>) => Promise<T>;
/** Manages vSphere task lifecycle: creation, status retrieval, and cancellation. */
declare class TaskEngine {
    private readonly callFn;
    private readonly logger;
    private propertyCollectorRef;
    constructor(callFn: CallFn, logger: Logger);
    setPropertyCollector(ref: MoRef): void;
    /**
     * Retrieves current task info via the PropertyCollector.
     * @param taskRef - Task managed object reference.
     */
    getTaskInfo(taskRef: MoRef): Promise<VsphereTask>;
    /**
     * Sends a cancel request for the given task.
     * @param taskRef - Task to cancel.
     */
    cancelTask(taskRef: MoRef): Promise<void>;
    createHandle(taskRef: MoRef): TaskHandle;
    /**
     * Extracts the task MoRef from a SOAP response and returns a {@link TaskHandle}.
     * @param response - Raw SOAP response containing the task reference.
     */
    handleTaskResponse(response: unknown): TaskHandle;
}

interface ObjectContent {
    obj: MoRef;
    propSet: Array<{
        name: string;
        val: unknown;
    }>;
}

declare class PropertyCollectorHelper {
    private readonly callFn;
    private readonly propertyCollectorRef;
    private readonly rootFolderRef;
    private readonly logger;
    private viewManagerRef;
    constructor(callFn: CallFn, propertyCollectorRef: MoRef, rootFolderRef: MoRef, logger: Logger);
    setViewManager(ref: MoRef): void;
    retrieveProperties(type: string, pathSet: string[], container?: MoRef): Promise<ObjectContent[]>;
    retrieveOne(moRef: MoRef, pathSet: string[]): Promise<Record<string, unknown> | null>;
    retrieveContainerContents(container: MoRef, type: string, pathSet: string[]): Promise<ObjectContent[]>;
    private executeRetrieve;
    private extractObjects;
    private buildTraversalSpecs;
}

/** Filter criteria for listing virtual machines. */
interface VmFilter {
    /** Restrict results to VMs inside this folder. */
    folderId?: MoRef;
    /** Restrict results to VMs in this cluster. */
    clusterId?: MoRef;
    /** Restrict results to VMs on this host. */
    hostId?: MoRef;
    /** Case-insensitive substring match on VM name. */
    nameContains?: string;
}
/** Provides read-only inventory queries against vCenter. */
declare class InventoryModule {
    private readonly pc;
    private readonly logger;
    constructor(pc: PropertyCollectorHelper, logger: Logger);
    /** Lists all datacenters in the inventory. */
    listDatacenters(): Promise<DatacenterSummary[]>;
    /**
     * Lists clusters, optionally filtered by datacenter.
     * @param datacenterId - Restrict to clusters in this datacenter.
     */
    listClusters(datacenterId?: MoRef): Promise<ClusterSummary[]>;
    /**
     * Lists ESXi hosts, optionally filtered by cluster.
     * @param clusterId - Restrict to hosts in this cluster.
     */
    listHosts(clusterId?: MoRef): Promise<HostSummary[]>;
    /**
     * Lists virtual machines with optional filtering.
     * @param filter - Criteria to narrow results.
     */
    listVMs(filter?: VmFilter): Promise<VmSummary[]>;
    /**
     * Retrieves a single VM by its managed object reference. Throws {@link VsphereErrorCode.NOT_FOUND} if missing.
     * @param vmId - VM managed object reference.
     */
    getVM(vmId: MoRef): Promise<VmSummary>;
    /**
     * Lists datastores, optionally filtered by datacenter.
     * @param datacenterId - Restrict to datastores in this datacenter.
     */
    listDatastores(datacenterId?: MoRef): Promise<DatastoreSummary[]>;
    /**
     * Lists networks, optionally filtered by datacenter.
     * @param datacenterId - Restrict to networks in this datacenter.
     */
    listNetworks(datacenterId?: MoRef): Promise<NetworkSummary[]>;
}

/** Specification for reconfiguring a VM's CPU, memory, or annotations. */
interface VmReconfigSpec {
    /** Number of virtual CPUs. */
    cpu?: number;
    /** Memory allocation in megabytes. */
    memoryMB?: number;
    /** VM annotation / notes. */
    notes?: string;
}
/** Options for cloning a virtual machine. */
interface VmCloneOptions {
    /** Name for the cloned VM. */
    name: string;
    /** Destination folder for the clone. */
    folder: MoRef;
    /** Target resource pool. */
    resourcePool?: MoRef;
    /** Target datastore. */
    datastore?: MoRef;
    /** Power on the clone after creation. Default: `false`. */
    powerOn?: boolean;
    /** Mark the clone as a template. Default: `false`. */
    asTemplate?: boolean;
}
/** VM power operations, reconfiguration, cloning, and lifecycle management. */
declare class VmModule {
    private readonly callFn;
    private readonly taskEngine;
    private readonly logger;
    constructor(callFn: CallFn, taskEngine: TaskEngine, logger: Logger);
    /**
     * Powers on a virtual machine.
     * @param vmId - VM to power on.
     * @param hostId - Optional target host for the power-on.
     */
    powerOn(vmId: MoRef, hostId?: MoRef): Promise<TaskHandle>;
    /**
     * Powers off a virtual machine (hard stop).
     * @param vmId - VM to power off.
     */
    powerOff(vmId: MoRef): Promise<TaskHandle>;
    /**
     * Hard-resets a virtual machine.
     * @param vmId - VM to reset.
     */
    reset(vmId: MoRef): Promise<TaskHandle>;
    /**
     * Suspends a virtual machine.
     * @param vmId - VM to suspend.
     */
    suspend(vmId: MoRef): Promise<TaskHandle>;
    /**
     * Reconfigures a VM's CPU, memory, or annotations.
     * @param vmId - VM to reconfigure.
     * @param spec - Desired configuration changes.
     */
    reconfigure(vmId: MoRef, spec: VmReconfigSpec): Promise<TaskHandle>;
    /**
     * Clones a virtual machine.
     * @param vmId - Source VM to clone.
     * @param options - Clone destination and settings.
     */
    clone(vmId: MoRef, options: VmCloneOptions): Promise<TaskHandle>;
    /**
     * Destroys a virtual machine and its associated files.
     * @param vmId - VM to destroy.
     */
    destroy(vmId: MoRef): Promise<TaskHandle>;
    /**
     * Unregisters a VM from inventory without deleting its files.
     * @param vmId - VM to unregister.
     */
    unregister(vmId: MoRef): Promise<void>;
}

/** Options for creating a VM snapshot. */
interface CreateSnapshotOptions {
    /** Snapshot display name. */
    name: string;
    /** Optional description. Default: `""`. */
    description?: string;
    /** Include VM memory in the snapshot. Default: `false`. */
    memory?: boolean;
    /** Quiesce the guest filesystem via VMware Tools. Default: `false`. */
    quiesce?: boolean;
}
/** Snapshot lifecycle operations for virtual machines. */
declare class SnapshotModule {
    private readonly callFn;
    private readonly taskEngine;
    private readonly pc;
    private readonly logger;
    constructor(callFn: CallFn, taskEngine: TaskEngine, pc: PropertyCollectorHelper, logger: Logger);
    /**
     * Creates a new snapshot for a VM.
     * @param vmId - Target VM.
     * @param options - Snapshot name and settings.
     */
    create(vmId: MoRef, options: CreateSnapshotOptions): Promise<TaskHandle>;
    /**
     * Lists the snapshot tree for a VM.
     * @param vmId - VM whose snapshots to list.
     */
    list(vmId: MoRef): Promise<Snapshot[]>;
    /**
     * Removes a single snapshot.
     * @param snapshotId - Snapshot to remove.
     * @param options - Set `removeChildren` to also remove child snapshots.
     */
    remove(snapshotId: MoRef, options?: {
        removeChildren?: boolean;
    }): Promise<TaskHandle>;
    /**
     * Removes all snapshots from a VM.
     * @param vmId - VM whose snapshots to remove.
     */
    removeAll(vmId: MoRef): Promise<TaskHandle>;
    /**
     * Reverts the VM to the specified snapshot.
     * @param snapshotId - Snapshot to revert to.
     */
    revert(snapshotId: MoRef): Promise<TaskHandle>;
    /**
     * Consolidates VM disks after snapshot operations.
     * @param vmId - VM whose disks to consolidate.
     */
    consolidate(vmId: MoRef): Promise<TaskHandle>;
}

/** Filter criteria for querying vSphere events. */
interface EventFilter {
    /** Return events created after this date. */
    since?: Date;
    /** Restrict to specific event type class names. */
    types?: string[];
    /** Restrict to events related to this entity. */
    entityId?: MoRef;
    /** Maximum number of events to return. Default: `100`. */
    maxCount?: number;
}
/** Queries the vCenter EventManager for historical events. */
declare class EventsModule {
    private readonly callFn;
    private readonly eventManagerRef;
    private readonly logger;
    constructor(callFn: CallFn, eventManagerRef: MoRef, logger: Logger);
    /**
     * Queries events from vCenter using an EventHistoryCollector.
     * @param filter - Optional criteria to narrow results.
     */
    query(filter?: EventFilter): Promise<VsphereEvent[]>;
}

/** Filter criteria for listing active alarms. */
interface AlarmFilter {
    /** Restrict to alarms on this entity; defaults to the root folder. */
    entityId?: MoRef;
}
/** Lists and acknowledges triggered vSphere alarms. */
declare class AlarmsModule {
    private readonly callFn;
    private readonly alarmManagerRef;
    private readonly pc;
    private readonly rootFolderRef;
    private readonly logger;
    constructor(callFn: CallFn, alarmManagerRef: MoRef, pc: PropertyCollectorHelper, rootFolderRef: MoRef, logger: Logger);
    /**
     * Lists currently triggered alarms.
     * @param options - Optional filter to scope by entity.
     */
    listActive(options?: AlarmFilter): Promise<VsphereAlarm[]>;
    /**
     * Acknowledges a triggered alarm on an entity.
     * @param alarmRef - The alarm to acknowledge.
     * @param entityRef - The entity the alarm is triggered on.
     */
    acknowledge(alarmRef: MoRef, entityRef: MoRef): Promise<void>;
}

/** Error codes used by {@link VsphereError} to classify failures. */
declare enum VsphereErrorCode {
    /** TCP/TLS connection to vCenter failed. */
    CONNECTION_FAILED = "CONNECTION_FAILED",
    /** Username or password rejected by vCenter. */
    AUTH_FAILED = "AUTH_FAILED",
    /** The SOAP session has expired or been invalidated. */
    SESSION_EXPIRED = "SESSION_EXPIRED",
    /** vCenter returned a SOAP fault. */
    SOAP_FAULT = "SOAP_FAULT",
    /** A vSphere task completed with an error. */
    TASK_FAILED = "TASK_FAILED",
    /** A vSphere task did not complete within the allowed timeout. */
    TASK_TIMEOUT = "TASK_TIMEOUT",
    /** The requested managed object was not found. */
    NOT_FOUND = "NOT_FOUND",
    /** Request was rejected due to rate limiting. */
    RATE_LIMITED = "RATE_LIMITED",
    /** An invalid argument was supplied. */
    INVALID_ARGUMENT = "INVALID_ARGUMENT",
    /** An unclassified error occurred. */
    UNKNOWN = "UNKNOWN"
}
/** Optional context attached to a {@link VsphereError}. */
interface VsphereErrorOptions {
    /** Raw SOAP fault object, if available. */
    soapFault?: unknown;
    /** Managed object reference related to the error. */
    moRef?: MoRef;
    /** Underlying cause error. */
    cause?: Error;
    /** HTTP status code, if applicable. */
    statusCode?: number;
}
/** Typed error thrown by all vsphere-client operations. */
declare class VsphereError extends Error {
    /** Machine-readable error classification. */
    readonly code: VsphereErrorCode;
    /** Raw SOAP fault, when the error originates from a SOAP call. */
    readonly soapFault?: unknown;
    /** Related managed object reference, if applicable. */
    readonly moRef?: MoRef;
    /** HTTP status code returned by vCenter, if applicable. */
    readonly statusCode?: number;
    /**
     * @param message - Human-readable error description.
     * @param code - Error classification code.
     * @param options - Additional error context.
     */
    constructor(message: string, code: VsphereErrorCode, options?: VsphereErrorOptions);
}

/** Filter for querying recent errors. */
interface RecentErrorsFilter {
    /** Return errors that occurred after this date. */
    since: Date;
}
/** Aggregates error events from vCenter and local error tracking. */
declare class HealthModule {
    private readonly callFn;
    private readonly eventsModule;
    private readonly logger;
    private errorBuffer;
    private readonly maxErrors;
    constructor(callFn: CallFn, eventsModule: EventsModule, logger: Logger);
    /**
     * Records a local error into the in-memory buffer.
     * @param code - Error classification code.
     * @param message - Human-readable error message.
     * @param options - Optional managed object reference and raw data.
     */
    recordError(code: VsphereErrorCode, message: string, options?: {
        moRef?: MoRef;
        raw?: unknown;
    }): void;
    /**
     * Returns recent errors from both vCenter events and the local buffer.
     * @param filter - Time-based filter.
     */
    recentErrors(filter: RecentErrorsFilter): Promise<NormalizedError[]>;
    /**
     * Returns locally recorded errors, optionally filtered to a recent time window.
     * @param sinceMs - Only return errors from the last N milliseconds.
     */
    getLocalErrors(sinceMs?: number): NormalizedError[];
    /** Returns a count of buffered errors grouped by source type. */
    getErrorSummary(): Record<string, number>;
    /** Clears all locally buffered errors. */
    clear(): void;
}

/** High-level client for the VMware vSphere SOAP API. */
declare class VsphereClient {
    private readonly soap;
    private readonly session;
    private readonly logger;
    private readonly config;
    private connected;
    private connectingPromise;
    private _taskEngine;
    private _inventory;
    private _vm;
    private _snapshots;
    private _events;
    private _alarms;
    private _health;
    constructor(config: VsphereClientConfig);
    /**
     * Creates a new client and connects in one step.
     * @param config - Connection and authentication settings.
     */
    static connect(config: VsphereClientConfig): Promise<VsphereClient>;
    /** Establishes a SOAP session and authenticates with vCenter. Throws {@link VsphereErrorCode.CONNECTION_FAILED} if already connected. */
    connect(): Promise<void>;
    private doConnect;
    /** Logs out of the vSphere session and closes the underlying connection. */
    disconnect(): Promise<void>;
    /** Inventory queries (VMs, hosts, clusters, datacenters, datastores). */
    get inventory(): InventoryModule;
    /** VM power operations and reconfiguration. */
    get vm(): VmModule;
    /** Snapshot create, list, revert, and remove operations. */
    get snapshots(): SnapshotModule;
    /** Event history queries. */
    get events(): EventsModule;
    /** Alarm listing and acknowledgement. */
    get alarms(): AlarmsModule;
    /** Health monitoring and recent error aggregation. */
    get health(): HealthModule;
    /** Raw vCenter ServiceContent returned at login. */
    get serviceContent(): ServiceContent;
    /**
     * Sends a raw SOAP method call to vCenter.
     * @internal
     * @param method - SOAP operation name.
     * @param args - Method arguments.
     */
    call<T>(method: string, args: Record<string, unknown>): Promise<T>;
    private initModules;
    private ensureConnected;
}

declare const noopLogger: Logger;

/** Configuration for exponential-backoff retry behavior. */
interface RetryOptions {
    /** Maximum number of retry attempts (not counting the initial call). */
    maxRetries: number;
    /** Base delay in ms before the first retry. */
    baseDelayMs: number;
    /** Maximum delay cap in ms. */
    maxDelayMs: number;
    /** Predicate to determine if an error is retryable; non-retryable errors bail immediately. */
    retryableCheck?: (err: unknown) => boolean;
}
/**
 * Executes `fn` with exponential backoff and jitter on failure.
 * @param fn - Async function to execute.
 * @param opts - Retry configuration overrides.
 */
declare function withRetry<T>(fn: () => Promise<T>, opts?: Partial<RetryOptions>): Promise<T>;

export { type AlarmFilter, type AlarmStatus, type ClusterSummary, type ConnectionState, type CreateSnapshotOptions, type DatacenterSummary, type DatastoreSummary, type EventFilter, type HostPowerState, type HostSummary, type Logger, type MoRef, type NetworkSummary, type NormalizedError, type PowerState, type RecentErrorsFilter, type RetryOptions, SERVICE_INSTANCE, type ServiceContent, type Snapshot, TaskHandle, type TaskState, type TaskWaitOptions, type VmCloneOptions, type VmFilter, type VmReconfigSpec, type VmSummary, type VsphereAlarm, VsphereClient, type VsphereClientConfig, VsphereError, VsphereErrorCode, type VsphereErrorOptions, type VsphereEvent, type VsphereTask, moRef, noopLogger, withRetry };
