# Performance Guidance

## Rate Limiting

Avoid overwhelming vCenter with too many concurrent requests:

```typescript
const client = await VsphereClient.connect({
  host: 'vcenter.example.com',
  username: 'admin',
  password: 'pass',
  maxConcurrency: 4,          // max parallel SOAP calls (default: 4)
  rateLimit: { maxPerSecond: 10 }, // token bucket rate limiter
});
```

## PropertyCollector Optimization

The library requests only the properties it needs via `pathSet`. When building custom queries, always specify the minimum set of properties:

```typescript
// Good: only fetch name and power state
const vms = await client.inventory.listVMs();

// The library requests: name, runtime.powerState, config.hardware.numCPU, etc.
// Not: all VM properties (which would be much slower)
```

## Bulk Operations

When operating on many VMs, launch tasks in parallel but limit concurrency:

```typescript
const vms = await client.inventory.listVMs();
const batchSize = 5;

for (let i = 0; i < vms.length; i += batchSize) {
  const batch = vms.slice(i, i + batchSize);
  const tasks = await Promise.all(
    batch.map(vm => client.snapshots.create(vm.moRef, { name: 'backup' }))
  );
  await Promise.all(tasks.map(t => t.wait()));
}
```

## Multi-vCenter Considerations

- Each `VsphereClient` instance has its own connection pool and rate limiter
- Query vCenters in parallel for best performance
- Consider staggering connections to avoid thundering herd on startup

## Task Polling

The default poll interval is 2 seconds. For long-running tasks (e.g., storage vMotion), increase the interval:

```typescript
await task.wait({
  pollIntervalMs: 10_000, // poll every 10 seconds
  timeoutMs: 3600_000,    // 1 hour timeout
});
```

## Memory

- The health module retains up to 500 error records in memory
- Event queries use server-side collectors that are cleaned up after each query
- Large inventory queries are paginated via `RetrievePropertiesEx` continuation tokens
