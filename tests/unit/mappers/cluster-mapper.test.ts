import { describe, it, expect } from 'vitest';
import { mapClusterProperties } from '../../../src/mappers/cluster-mapper.js';

describe('mapClusterProperties', () => {
  it('should map cluster properties correctly', () => {
    const moRef = { type: 'ClusterComputeResource', value: 'domain-c1' };
    const propSet = [
      { name: 'name', val: 'Production Cluster' },
      { name: 'summary.numHosts', val: '4' },
      { name: 'summary.numEffectiveHosts', val: '3' },
      { name: 'summary.totalCpu', val: '96000' },
      { name: 'summary.totalMemory', val: '274877906944' },
      {
        name: 'parent',
        val: { attributes: { type: 'Folder' }, $value: 'group-h1' },
      },
    ];

    const cluster = mapClusterProperties(moRef, propSet);

    expect(cluster.moRef).toEqual(moRef);
    expect(cluster.name).toBe('Production Cluster');
    expect(cluster.numHosts).toBe(4);
    expect(cluster.numEffectiveHosts).toBe(3);
    expect(cluster.totalCpu).toBe(96000);
    expect(cluster.totalMemory).toBe(274877906944);
    expect(cluster.parentRef).toEqual({ type: 'Folder', value: 'group-h1' });
  });

  it('should handle missing optional properties', () => {
    const moRef = { type: 'ClusterComputeResource', value: 'domain-c2' };
    const propSet = [{ name: 'name', val: 'Dev Cluster' }];

    const cluster = mapClusterProperties(moRef, propSet);
    expect(cluster.name).toBe('Dev Cluster');
    expect(cluster.numHosts).toBe(0);
    expect(cluster.parentRef).toBeUndefined();
  });
});
