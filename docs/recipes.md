# Common Recipes

## List VMs by Power State

```typescript
const runningVMs = await client.inventory.listVMs();
const powered = runningVMs.filter(vm => vm.powerState === 'poweredOn');
const templates = runningVMs.filter(vm => vm.template);
```

## Multi-vCenter Inventory

```typescript
async function getAllVMs(configs: VsphereClientConfig[]) {
  const clients = await Promise.all(configs.map(c => VsphereClient.connect(c)));

  try {
    const results = await Promise.all(
      clients.map(async (client, i) => {
        const vms = await client.inventory.listVMs();
        return vms.map(vm => ({ ...vm, vcenter: configs[i].host }));
      })
    );
    return results.flat();
  } finally {
    await Promise.all(clients.map(c => c.disconnect()));
  }
}
```

## Snapshot All VMs in a Cluster

```typescript
const vms = await client.inventory.listVMs({ clusterId: clusterRef });
const tasks = await Promise.all(
  vms
    .filter(vm => vm.powerState === 'poweredOn')
    .map(vm => client.snapshots.create(vm.moRef, { name: 'nightly-backup' }))
);

// Wait for all snapshots to complete
await Promise.all(tasks.map(t => t.wait({ timeoutMs: 300_000 })));
```

## Monitor Events Continuously

```typescript
async function pollEvents(client: VsphereClient, intervalMs = 60_000) {
  let lastCheck = new Date(Date.now() - intervalMs);

  setInterval(async () => {
    const events = await client.events.query({ since: lastCheck });
    for (const event of events) {
      console.log(`[${event.createdTime.toISOString()}] ${event.eventType}: ${event.message}`);
    }
    lastCheck = new Date();
  }, intervalMs);
}
```

## Power Operations with Confirmation

```typescript
async function safeReboot(client: VsphereClient, vmRef: MoRef) {
  // Power off
  const offTask = await client.vm.powerOff(vmRef);
  await offTask.wait();

  // Wait a bit
  await new Promise(r => setTimeout(r, 5000));

  // Power on
  const onTask = await client.vm.powerOn(vmRef);
  await onTask.wait();
}
```

## Alarm Dashboard

```typescript
const alarms = await client.alarms.listActive();
const red = alarms.filter(a => a.status === 'red');
const yellow = alarms.filter(a => a.status === 'yellow');

console.log(`Critical: ${red.length}, Warning: ${yellow.length}`);
for (const alarm of red) {
  console.log(`  [CRITICAL] ${alarm.entityName}: ${alarm.alarmName}`);
}
```

## Reconfigure VM

```typescript
const task = await client.vm.reconfigure(vmRef, {
  cpu: 4,
  memoryMB: 16384,
  notes: 'Updated for production workload',
});
await task.wait();
```
