# vmware-sdk-node

Production-grade Node.js TypeScript library for managing multiple VMware vCenters.

## Features

- **Multi-vCenter support** — Each client instance manages its own session independently
- **Full inventory browsing** — Datacenters, clusters, hosts, VMs, datastores, networks
- **VM lifecycle** — Power on/off/reset, reconfigure, clone, destroy, snapshots
- **Events & alarms** — Query events, list active alarms, error aggregation
- **Task engine** — All mutating operations return a `TaskHandle` with `wait()` and `status()`
- **Type-safe** — Full TypeScript types and JSDoc on all public APIs
- **SOAP-first** — Uses VMware VIM/Web Services SDK directly
- **Production-ready** — Rate limiting, concurrency control, retry logic, structured errors

## Installation

```bash
# Install from GitHub
npm install github:itamarbeer/vmware-sdk-node
```

```typescript
import { VsphereClient } from 'vmware-sdk-node';

const client = await VsphereClient.connect({
  host: 'vcenter.example.com',
  username: 'administrator@vsphere.local',
  password: 'your-password',
});

// List all VMs
const vms = await client.inventory.listVMs();
console.log(vms.map(vm => `${vm.name}: ${vm.powerState}`));

// Create a snapshot
const task = await client.snapshots.create(vms[0].moRef, { name: 'backup' });
await task.wait();

// Query recent events
const events = await client.events.query({ since: new Date(Date.now() - 3600_000) });

// Check active alarms
const alarms = await client.alarms.listActive();

await client.disconnect();
```

## API Overview

| Module | Methods |
|--------|---------|
| `client.inventory` | `listDatacenters()`, `listClusters()`, `listHosts()`, `listVMs()`, `getVM()` |
| `client.vm` | `powerOn()`, `powerOff()`, `reset()`, `suspend()`, `reconfigure()` |
| `client.snapshots` | `create()`, `list()`, `remove()`, `removeAll()`, `revert()`, `consolidate()` |
| `client.events` | `query({ since, types, entityId })` |
| `client.alarms` | `listActive({ entityId })`, `acknowledge()` |
| `client.health` | `recentErrors({ since })`, `getLocalErrors()`, `getErrorSummary()` |

All mutating operations return a `TaskHandle`:

```typescript
const task = await client.vm.powerOn(vmRef);
const result = await task.wait({ timeoutMs: 60_000 });
```

## Configuration

```typescript
const client = new VsphereClient({
  host: 'vcenter.example.com',
  username: 'admin',
  password: 'pass',
  port: 443,                     // default: 443
  insecure: false,               // default: false (verify TLS)
  ca: readFileSync('ca.pem'),    // custom CA certificate
  keepAliveIntervalMs: 600_000,  // default: 10 minutes
  requestTimeoutMs: 60_000,      // default: 60 seconds
  maxConcurrency: 4,             // default: 4
  rateLimit: { maxPerSecond: 10 },
  logger: console,               // { debug, info, warn, error }
});
```

## Development

```bash
cd packages/vsphere-client
npm install
npm run build        # Build with tsup
npm run test         # Run unit tests
npm run lint         # ESLint
npm run typecheck    # TypeScript check
npm run docs         # Generate typedoc
```

### Integration Tests

```bash
VC_HOST=vcenter.example.com \
VC_USER=admin \
VC_PASS=secret \
npm run test:integration
```

## Documentation

- [Quickstart](docs/quickstart.md)
- [Auth & TLS](docs/auth-tls.md)
- [Common Recipes](docs/recipes.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Performance](docs/performance.md)

## Architecture

```
VsphereClient
  +-- SoapClient (WSDL, session cookies, rate limiting, concurrency)
  +-- SessionManager (login, logout, keep-alive)
  +-- TaskEngine (TaskHandle, polling, timeout)
  +-- InventoryModule (PropertyCollector-based queries)
  +-- VmModule (power ops, reconfigure)
  +-- SnapshotModule (CRUD + consolidate)
  +-- EventsModule (EventHistoryCollector)
  +-- AlarmsModule (triggered alarm state)
  +-- HealthModule (error aggregation)
```

The library uses the VMware VIM SOAP API exclusively. All objects are referenced via `MoRef` (Managed Object Reference: `{ type, value }`).

## Next Iterations

- DVS (Distributed Virtual Switch) management
- vSAN health monitoring
- Performance counters via `PerfManager`
- Storage policy management
- Guest OS operations (file, process management)
- VM migration (vMotion, Storage vMotion)
- Resource pool management
- Content Library support
- REST API adapter for vSphere 7+ REST endpoints
- WebSocket-based event streaming
- Prometheus metrics exporter

## License

MIT
