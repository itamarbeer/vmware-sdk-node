import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from './setup.js';
import type { VsphereClient } from '../../src/index.js';

const skip = !process.env.VC_INTEGRATION;

describe.skipIf(skip)('Inventory Integration', () => {
  let client: VsphereClient;

  beforeAll(async () => {
    client = await createTestClient();
  });

  afterAll(async () => {
    await client?.disconnect();
  });

  it('should list clusters', async () => {
    const clusters = await client.inventory.listClusters();
    expect(Array.isArray(clusters)).toBe(true);
  });

  it('should list hosts', async () => {
    const hosts = await client.inventory.listHosts();
    expect(Array.isArray(hosts)).toBe(true);
  });

  it('should list VMs', async () => {
    const vms = await client.inventory.listVMs();
    expect(Array.isArray(vms)).toBe(true);
    if (vms.length > 0) {
      expect(vms[0].name).toBeDefined();
      expect(vms[0].powerState).toBeDefined();
    }
  });

  it('should list VMs with name filter', async () => {
    const vms = await client.inventory.listVMs({ nameContains: 'test' });
    expect(Array.isArray(vms)).toBe(true);
  });
});
