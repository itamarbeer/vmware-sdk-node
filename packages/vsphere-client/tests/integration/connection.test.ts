import { describe, it, expect, afterAll } from 'vitest';
import { createTestClient } from './setup.js';
import type { VsphereClient } from '../../src/index.js';

const skip = !process.env.VC_INTEGRATION;

describe.skipIf(skip)('Connection Integration', () => {
  let client: VsphereClient;

  afterAll(async () => {
    await client?.disconnect();
  });

  it('should connect and retrieve service content', async () => {
    client = await createTestClient();
    const sc = client.serviceContent;
    expect(sc.aboutInfo.version).toBeDefined();
    expect(sc.aboutInfo.apiVersion).toBeDefined();
  });

  it('should list datacenters', async () => {
    const dcs = await client.inventory.listDatacenters();
    expect(Array.isArray(dcs)).toBe(true);
    expect(dcs.length).toBeGreaterThan(0);
    expect(dcs[0].name).toBeDefined();
  });
});
