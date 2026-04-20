import { describe, it, expect } from 'vitest';
import { mapNetworkProperties } from '../../../src/mappers/network-mapper.js';

describe('mapNetworkProperties', () => {
  it('should map network properties correctly', () => {
    const moRef = { type: 'Network', value: 'network-1' };
    const propSet = [
      { name: 'name', val: 'VM Network' },
      { name: 'summary.accessible', val: 'true' },
      { name: 'summary.ipPoolName', val: 'pool1' },
    ];

    const net = mapNetworkProperties(moRef, propSet);
    expect(net.moRef).toEqual(moRef);
    expect(net.name).toBe('VM Network');
    expect(net.accessible).toBe(true);
    expect(net.ipPoolName).toBe('pool1');
  });

  it('should handle inaccessible network', () => {
    const moRef = { type: 'Network', value: 'network-2' };
    const propSet = [
      { name: 'name', val: 'offline-net' },
      { name: 'summary.accessible', val: 'false' },
    ];

    const net = mapNetworkProperties(moRef, propSet);
    expect(net.accessible).toBe(false);
    expect(net.ipPoolName).toBeUndefined();
  });
});
