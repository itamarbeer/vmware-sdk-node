# Quickstart

## Installation

```bash
npm install nodevecenter
```

## Basic Usage

```typescript
import { VsphereClient } from 'nodevecenter';

// Connect to vCenter
const client = await VsphereClient.connect({
  host: 'vcenter.example.com',
  username: 'administrator@vsphere.local',
  password: 'your-password',
});

// List all VMs
const vms = await client.inventory.listVMs();
for (const vm of vms) {
  console.log(`${vm.name}: ${vm.powerState} (${vm.numCpu} CPU, ${vm.memoryMB}MB RAM)`);
}

// Create a snapshot
const task = await client.snapshots.create(vms[0].moRef, {
  name: 'pre-upgrade',
  description: 'Snapshot before upgrade',
});
await task.wait();

// Disconnect when done
await client.disconnect();
```

## Multiple vCenters

Each `VsphereClient` instance manages its own connection independently:

```typescript
const clients = await Promise.all([
  VsphereClient.connect({ host: 'vc1.example.com', username: 'admin', password: 'pass1' }),
  VsphereClient.connect({ host: 'vc2.example.com', username: 'admin', password: 'pass2' }),
]);

// Query all vCenters in parallel
const allVMs = (await Promise.all(clients.map(c => c.inventory.listVMs()))).flat();

// Disconnect all
await Promise.all(clients.map(c => c.disconnect()));
```

## Error Handling

```typescript
import { VsphereError, VsphereErrorCode } from 'nodevecenter';

try {
  await client.connect();
} catch (err) {
  if (err instanceof VsphereError) {
    switch (err.code) {
      case VsphereErrorCode.AUTH_FAILED:
        console.error('Invalid credentials');
        break;
      case VsphereErrorCode.CONNECTION_FAILED:
        console.error('Cannot reach vCenter');
        break;
    }
  }
}
```
