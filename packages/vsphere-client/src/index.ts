export { VsphereClient } from './client/index.js';
export type { VsphereClientConfig, Logger } from './types/config.js';
export type { MoRef } from './types/mo-ref.js';
export { moRef, SERVICE_INSTANCE } from './types/mo-ref.js';
export { VsphereError, VsphereErrorCode } from './types/errors.js';
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
} from './types/models.js';
export { TaskHandle } from './tasks/index.js';
export type { TaskWaitOptions } from './tasks/index.js';
export type { VmFilter } from './inventory/index.js';
export type { EventFilter } from './events/index.js';
export type { VmReconfigSpec, VmCloneOptions } from './vm/index.js';
export type { CreateSnapshotOptions } from './snapshots/index.js';
export type { RecentErrorsFilter } from './health/index.js';
export type { AlarmFilter } from './alarms/index.js';
export type { VsphereErrorOptions } from './types/errors.js';
export { noopLogger } from './utils/logger.js';
export { withRetry } from './utils/retry.js';
export type { RetryOptions } from './utils/retry.js';
