/**
 * Example: List all VMs with their power state
 *
 * Usage:
 *   VC_HOST=vcenter.example.com VC_USER=admin VC_PASS=secret npx tsx examples/list-vms.ts
 */
import { VsphereClient } from '../packages/vsphere-client/src/index.js';

async function main() {
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
    // List datacenters
    const datacenters = await client.inventory.listDatacenters();
    console.log('\n--- Datacenters ---');
    for (const dc of datacenters) {
      console.log(`  ${dc.name} (${dc.moRef.value})`);
    }

    // List all VMs
    const vms = await client.inventory.listVMs();
    console.log('\n--- Virtual Machines ---');
    console.table(
      vms.map((vm) => ({
        Name: vm.name,
        State: vm.powerState,
        CPU: vm.numCpu,
        'Memory (MB)': vm.memoryMB,
        IP: vm.ipAddress ?? 'N/A',
        Template: vm.template,
      })),
    );

    // Summary
    const on = vms.filter((v) => v.powerState === 'poweredOn').length;
    const off = vms.filter((v) => v.powerState === 'poweredOff').length;
    console.log(`\nTotal: ${vms.length} VMs (${on} on, ${off} off)`);
  } finally {
    await client.disconnect();
  }
}

main().catch(console.error);
