export type { MoRef } from './mo-ref.js';
export { moRef, SERVICE_INSTANCE } from './mo-ref.js';
export { VsphereError, VsphereErrorCode } from './errors.js';
export type { VsphereErrorOptions } from './errors.js';
export type { Logger, VsphereClientConfig } from './config.js';
export type {
  PowerState,
  ConnectionState,
  HostPowerState,
  TaskState,
  AlarmStatus,
  VmSummary,
  HostSummary,
  ClusterSummary,
  DatacenterSummary,
  DatastoreSummary,
  NetworkSummary,
  Snapshot,
  VsphereEvent,
  VsphereAlarm,
  VsphereTask,
  ServiceContent,
  NormalizedError,
} from './models.js';
