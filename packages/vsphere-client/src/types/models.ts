import type { MoRef } from './mo-ref.js';

/** Virtual machine power state. */
export type PowerState = 'poweredOn' | 'poweredOff' | 'suspended';
/** ESXi host connection state. */
export type ConnectionState = 'connected' | 'disconnected' | 'notResponding';
/** ESXi host power state. */
export type HostPowerState = 'poweredOn' | 'standBy' | 'unknown';
/** vSphere task lifecycle state. */
export type TaskState = 'queued' | 'running' | 'success' | 'error';
/** Alarm severity: red (critical), yellow (warning), green (ok), gray (unknown). */
export type AlarmStatus = 'red' | 'yellow' | 'green' | 'gray';

/** Summary information for a virtual machine. */
export interface VmSummary {
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
export interface HostSummary {
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
export interface ClusterSummary {
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
export interface DatacenterSummary {
  /** Datacenter managed object reference. */
  moRef: MoRef;
  /** Datacenter display name. */
  name: string;
}

/** Summary information for a datastore. */
export interface DatastoreSummary {
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
export interface NetworkSummary {
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
export interface Snapshot {
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
export interface VsphereEvent {
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
export interface VsphereAlarm {
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
export interface VsphereTask {
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
export interface ServiceContent {
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
export interface NormalizedError {
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
