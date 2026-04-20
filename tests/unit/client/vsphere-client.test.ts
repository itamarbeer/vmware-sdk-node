import { describe, it, expect } from 'vitest';
import { VsphereClient } from '../../../src/client/vsphere-client.js';
import { VsphereError, VsphereErrorCode } from '../../../src/types/errors.js';

describe('VsphereClient', () => {
  it('should throw when accessing modules before connect', () => {
    const client = new VsphereClient({
      host: 'fake-host',
      username: 'admin',
      password: 'pass',
    });

    expect(() => client.inventory).toThrow(VsphereError);
    expect(() => client.vm).toThrow(VsphereError);
    expect(() => client.snapshots).toThrow(VsphereError);
    expect(() => client.events).toThrow(VsphereError);
    expect(() => client.alarms).toThrow(VsphereError);
    expect(() => client.health).toThrow(VsphereError);
    expect(() => client.serviceContent).toThrow(VsphereError);
  });

  it('should throw VsphereError with CONNECTION_FAILED code', () => {
    const client = new VsphereClient({
      host: 'fake-host',
      username: 'admin',
      password: 'pass',
    });

    try {
      client.inventory;
    } catch (err) {
      expect(err).toBeInstanceOf(VsphereError);
      expect((err as VsphereError).code).toBe(VsphereErrorCode.CONNECTION_FAILED);
    }
  });

  it('should not throw on disconnect when not connected', async () => {
    const client = new VsphereClient({
      host: 'fake-host',
      username: 'admin',
      password: 'pass',
    });

    await expect(client.disconnect()).resolves.toBeUndefined();
  });
});
