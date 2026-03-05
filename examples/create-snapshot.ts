/**
 * Example: Create a snapshot for VMs matching a name pattern and wait for completion
 *
 * Usage:
 *   VC_HOST=vcenter.example.com VC_USER=admin VC_PASS=secret \
 *     npx tsx examples/create-snapshot.ts "web-server"
 */
import { VsphereClient } from '../packages/vsphere-client/src/index.js';

async function main() {
  const namePattern = process.argv[2];
  if (!namePattern) {
    console.error('Usage: create-snapshot.ts <vm-name-pattern>');
    process.exit(1);
  }

  const client = await VsphereClient.connect({
    host: process.env.VC_HOST!,
    username: process.env.VC_USER!,
    password: process.env.VC_PASS!,
    insecure: process.env.VC_INSECURE === 'true', // Only disable TLS verify if explicitly set
    logger: {
      debug: () => {},
      info: console.info,
      warn: console.warn,
      error: console.error,
    },
  });

  try {
    // Find VMs matching the pattern
    const vms = await client.inventory.listVMs({ nameContains: namePattern });

    if (vms.length === 0) {
      console.log(`No VMs found matching "${namePattern}"`);
      return;
    }

    console.log(`Found ${vms.length} VM(s) matching "${namePattern}":`);
    for (const vm of vms) {
      console.log(`  - ${vm.name} (${vm.powerState})`);
    }

    // Create snapshots
    const snapshotName = `backup-${new Date().toISOString().slice(0, 10)}`;

    for (const vm of vms) {
      console.log(`\nCreating snapshot "${snapshotName}" for ${vm.name}...`);

      const task = await client.snapshots.create(vm.moRef, {
        name: snapshotName,
        description: `Automated snapshot created on ${new Date().toISOString()}`,
        memory: false,
        quiesce: true,
      });

      const result = await task.wait({
        timeoutMs: 120_000,
        onProgress: (p) => console.log(`  Progress: ${p}%`),
      });

      console.log(`  Snapshot created successfully for ${vm.name}`);
    }

    // Verify by listing snapshots for the first VM
    console.log(`\nSnapshots for ${vms[0].name}:`);
    const snapshots = await client.snapshots.list(vms[0].moRef);
    for (const snap of snapshots) {
      console.log(`  - ${snap.name} (${snap.createTime.toISOString()})`);
    }
  } finally {
    await client.disconnect();
  }
}

main().catch(console.error);
