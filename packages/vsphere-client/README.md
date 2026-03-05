# vmware-sdk-node

A typed Node.js client for the VMware vSphere SOAP API. Provides a clean, module-based interface for managing virtual machines, snapshots, events, alarms, and inventory across one or more vCenter servers.

## Installation

```bash
# Install from GitHub
npm install github:itamarbeer/vmware-sdk-node
```

## Quick Start

```typescript
import { VsphereClient } from 'vmware-sdk-node';

const client = await VsphereClient.connect({
  host: 'vcenter.example.com',
  username: 'administrator@vsphere.local',
  password: 'secret',
  insecure: true, // skip TLS verification (dev only)
});

const vms = await client.inventory.listVMs();
for (const vm of vms) {
  console.log(`${vm.name} — ${vm.powerState} (${vm.numCpu} vCPU, ${vm.memoryMB} MB)`);
}

await client.disconnect();
```

You can also construct and connect separately:

```typescript
const client = new VsphereClient(config);
await client.connect();
// ...
await client.disconnect();
```

## Configuration

All options for `VsphereClientConfig`:

| Option               | Type                          | Default     | Description                                      |
|----------------------|-------------------------------|-------------|--------------------------------------------------|
| `host`               | `string`                      | *required*  | vCenter hostname or IP address                   |
| `username`           | `string`                      | *required*  | Login username                                   |
| `password`           | `string`                      | *required*  | Login password                                   |
| `port`               | `number`                      | `443`       | HTTPS port                                       |
| `insecure`           | `boolean`                     | `false`     | Skip TLS certificate verification                |
| `ca`                 | `string \| Buffer`            | `undefined` | Custom CA certificate for TLS                    |
| `logger`             | `Logger`                      | noop logger | Logger implementing `debug/info/warn/error`      |
| `keepAliveIntervalMs`| `number`                      | —           | Interval for session keep-alive pings            |
| `requestTimeoutMs`   | `number`                      | —           | Timeout per SOAP request                         |
| `maxConcurrency`     | `number`                      | —           | Max concurrent SOAP requests                     |
| `rateLimit`          | `{ maxPerSecond: number }`    | `undefined` | Rate limit outbound requests                     |

### TLS / Insecure Mode

For self-signed certificates in development, set `insecure: true`. In production, supply a CA bundle:

```typescript
import { readFileSync } from 'node:fs';

const client = await VsphereClient.connect({
  host: 'vcenter.example.com',
  username: 'admin@vsphere.local',
  password: 'secret',
  ca: readFileSync('/path/to/ca-bundle.pem'),
});
```

### Logger Integration

Any object with `debug`, `info`, `warn`, and `error` methods works. For example, with [pino](https://github.com/pinojs/pino):

```typescript
import pino from 'pino';

const client = await VsphereClient.connect({
  host: 'vcenter.example.com',
  username: 'admin@vsphere.local',
  password: 'secret',
  logger: pino({ level: 'debug' }),
});
```

A `noopLogger` is exported for cases where you need an explicit silent logger:

```typescript
import { noopLogger } from 'vmware-sdk-node';
```

## Modules

All modules are accessed as properties on a connected `VsphereClient` instance.

### Inventory

Discover datacenters, clusters, hosts, VMs, and datastores.

```typescript
// Datacenters
const dcs = await client.inventory.listDatacenters();

// Clusters (optionally scoped to a datacenter)
const clusters = await client.inventory.listClusters(dcs[0].moRef);

// Hosts (optionally scoped to a cluster)
const hosts = await client.inventory.listHosts(clusters[0].moRef);

// VMs with optional filters
const vms = await client.inventory.listVMs({
  clusterId: clusters[0].moRef,
  nameContains: 'web-server',
});

// Single VM by MoRef
import { moRef } from 'vmware-sdk-node';
const vm = await client.inventory.getVM(moRef('VirtualMachine', 'vm-42'));

// Datastores (optionally scoped to a datacenter)
const datastores = await client.inventory.listDatastores(dcs[0].moRef);
```

**VmFilter options:** `folderId`, `clusterId`, `hostId`, `nameContains`.

### VM Operations

Power operations and reconfiguration return a `TaskHandle` that you can `await` with `.wait()`.

```typescript
const vms = await client.inventory.listVMs({ nameContains: 'my-vm' });
const vmRef = vms[0].moRef;

// Power on
const task = await client.vm.powerOn(vmRef);
await task.wait();

// Power off
await (await client.vm.powerOff(vmRef)).wait();

// Reset & suspend
await (await client.vm.reset(vmRef)).wait();
await (await client.vm.suspend(vmRef)).wait();

// Reconfigure CPU, memory, or annotation
const reconfigTask = await client.vm.reconfigure(vmRef, {
  cpu: 4,
  memoryMB: 8192,
  notes: 'Updated by automation',
});
await reconfigTask.wait();

// Clone a VM
const cloneTask = await client.vm.clone(vmRef, {
  name: 'my-vm-clone',
  folder: moRef('Folder', 'group-v3'),
  powerOn: true,
});
await cloneTask.wait();

// Destroy (delete from disk) or unregister (remove from inventory only)
await (await client.vm.destroy(vmRef)).wait();
await client.vm.unregister(vmRef);
```

### Snapshots

```typescript
const vmRef = moRef('VirtualMachine', 'vm-42');

// Create a snapshot
const task = await client.snapshots.create(vmRef, {
  name: 'before-upgrade',
  description: 'Clean state before OS upgrade',
  memory: false,
  quiesce: true,
});
await task.wait();

// List snapshots (returns a tree structure)
const snapshots = await client.snapshots.list(vmRef);
console.log(snapshots); // Snapshot[] with nested children

// Revert to a snapshot
await (await client.snapshots.revert(snapshots[0].moRef)).wait();

// Remove a single snapshot
await (await client.snapshots.remove(snapshots[0].moRef, { removeChildren: false })).wait();

// Remove all snapshots
await (await client.snapshots.removeAll(vmRef)).wait();

// Consolidate disks
await (await client.snapshots.consolidate(vmRef)).wait();
```

### Events

Query the vCenter event history with optional filters.

```typescript
// All recent events (default max 100)
const events = await client.events.query();

// Filtered query
const filtered = await client.events.query({
  since: new Date(Date.now() - 3600_000), // last hour
  types: ['VmPoweredOnEvent', 'VmPoweredOffEvent'],
  entityId: moRef('VirtualMachine', 'vm-42'),
  maxCount: 50,
});

for (const event of filtered) {
  console.log(`[${event.createdTime.toISOString()}] ${event.eventType}: ${event.message}`);
}
```

**EventFilter options:** `since`, `types`, `entityId`, `maxCount`.

### Alarms

```typescript
// List all active alarms (or scoped to an entity)
const alarms = await client.alarms.listActive();
const vmAlarms = await client.alarms.listActive({
  entityId: moRef('VirtualMachine', 'vm-42'),
});

for (const alarm of alarms) {
  console.log(`${alarm.alarmName} on ${alarm.entityName} — status: ${alarm.status}`);
}

// Acknowledge an alarm
await client.alarms.acknowledge(alarm.alarmRef, alarm.entityRef);
```

### Health Monitoring

The health module aggregates error events from vCenter and locally recorded errors into a unified view.

```typescript
// Record a local error (e.g., from your own error handling)
client.health.recordError('SOAP_FAULT', 'Connection reset mid-request', {
  moRef: moRef('VirtualMachine', 'vm-42'),
});

// Fetch recent errors from vCenter events + local buffer
const errors = await client.health.recentErrors({
  since: new Date(Date.now() - 3600_000),
});

// Get only locally recorded errors (last 5 minutes)
const localErrors = client.health.getLocalErrors(5 * 60_000);

// Get error count by source type
const summary = client.health.getErrorSummary();
// { VirtualMachine: 3, HostSystem: 1 }
```

## Task Handling

Async vSphere operations (power, reconfigure, snapshot, clone) return a `TaskHandle`. This gives you fine-grained control over task lifecycle.

```typescript
const task = await client.vm.powerOn(vmRef);

// Check current status without waiting
const info = await task.status();
console.log(info.state, info.progress);

// Wait for completion with defaults (5 min timeout, 2s poll)
const result = await task.wait();

// Wait with custom options
await task.wait({
  timeoutMs: 60_000,
  pollIntervalMs: 1_000,
  onProgress: (pct) => console.log(`Progress: ${pct}%`),
});

// Cancel a running task
await task.cancel();

// Access the task MoRef directly
console.log(task.moRef);
```

**TaskWaitOptions:**

| Option           | Type                        | Default    | Description                       |
|------------------|-----------------------------|------------|-----------------------------------|
| `timeoutMs`      | `number`                    | `300000`   | Max time to wait before throwing  |
| `pollIntervalMs` | `number`                    | `2000`     | Interval between status polls     |
| `onProgress`     | `(progress: number) => void`| `undefined`| Called when task progress updates  |

If a task fails, `wait()` throws a `VsphereError` with code `TASK_FAILED`. If it times out, the code is `TASK_TIMEOUT`.

## Error Handling

All errors thrown by the client are instances of `VsphereError`, which extends `Error` with structured metadata.

```typescript
import { VsphereError, VsphereErrorCode } from 'vmware-sdk-node';

try {
  await client.vm.powerOn(vmRef);
} catch (err) {
  if (err instanceof VsphereError) {
    console.error(`Code: ${err.code}`);        // e.g. 'TASK_FAILED'
    console.error(`Message: ${err.message}`);
    console.error(`MoRef: ${err.moRef?.value}`);
    console.error(`SOAP fault:`, err.soapFault);
    console.error(`HTTP status:`, err.statusCode);
    console.error(`Cause:`, err.cause);
  }
}
```

**Error codes (`VsphereErrorCode`):**

| Code                | When it occurs                                     |
|---------------------|----------------------------------------------------|
| `CONNECTION_FAILED` | TCP/TLS connection to vCenter failed               |
| `AUTH_FAILED`       | Username or password rejected                      |
| `SESSION_EXPIRED`   | SOAP session expired or invalidated                |
| `SOAP_FAULT`        | vCenter returned a SOAP fault                      |
| `TASK_FAILED`       | A vSphere task completed with an error             |
| `TASK_TIMEOUT`      | A task did not complete within the allowed timeout  |
| `NOT_FOUND`         | Requested managed object was not found             |
| `RATE_LIMITED`      | Request rejected due to rate limiting              |
| `INVALID_ARGUMENT`  | An invalid argument was supplied                   |
| `UNKNOWN`           | Unclassified error                                 |

### Retry Utility

The exported `withRetry` helper provides exponential backoff with jitter:

```typescript
import { withRetry, VsphereError } from 'vmware-sdk-node';

const vms = await withRetry(() => client.inventory.listVMs(), {
  maxRetries: 3,       // default: 3
  baseDelayMs: 1000,   // default: 1000
  maxDelayMs: 30_000,  // default: 30000
  retryableCheck: (err) =>
    err instanceof VsphereError && err.code === 'SOAP_FAULT',
});
```

## Multi-vCenter Usage

Create separate client instances for each vCenter. Since each client manages its own session, they can operate concurrently.

```typescript
const vcenters = [
  { host: 'vc-us.example.com', username: 'admin@vsphere.local', password: 'pw1', insecure: true },
  { host: 'vc-eu.example.com', username: 'admin@vsphere.local', password: 'pw2', insecure: true },
];

const clients = await Promise.all(
  vcenters.map((cfg) => VsphereClient.connect(cfg)),
);

// Query VMs across all vCenters
const allVMs = (
  await Promise.all(clients.map((c) => c.inventory.listVMs()))
).flat();

console.log(`Total VMs across ${clients.length} vCenters: ${allVMs.length}`);

// Clean up
await Promise.all(clients.map((c) => c.disconnect()));
```

### Pattern: vCenter-Aware Results

```typescript
interface TaggedVm {
  vcenter: string;
  vm: VmSummary;
}

async function listAllVMs(
  configs: VsphereClientConfig[],
): Promise<TaggedVm[]> {
  const results: TaggedVm[] = [];

  await Promise.all(
    configs.map(async (cfg) => {
      const client = await VsphereClient.connect(cfg);
      try {
        const vms = await client.inventory.listVMs();
        results.push(...vms.map((vm) => ({ vcenter: cfg.host, vm })));
      } finally {
        await client.disconnect();
      }
    }),
  );

  return results;
}
```

## API Reference

All public types and functions are exported from the package root:

```typescript
// Client
export { VsphereClient } from 'vmware-sdk-node';

// Types
export type {
  VsphereClientConfig, Logger, MoRef,
  VmSummary, HostSummary, ClusterSummary, DatacenterSummary, DatastoreSummary,
  Snapshot, VsphereEvent, VsphereAlarm, VsphereTask, ServiceContent, NormalizedError,
  PowerState, ConnectionState, HostPowerState, TaskState, AlarmStatus,
  VmFilter, EventFilter, AlarmFilter, VmReconfigSpec, CreateSnapshotOptions,
  TaskWaitOptions, RecentErrorsFilter, RetryOptions, VsphereErrorOptions,
} from 'vmware-sdk-node';

// Utilities
export { moRef, SERVICE_INSTANCE, VsphereError, VsphereErrorCode, TaskHandle, noopLogger, withRetry } from 'vmware-sdk-node';
```

## License

ISC
