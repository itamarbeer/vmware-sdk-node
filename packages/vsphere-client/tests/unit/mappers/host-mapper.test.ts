import { describe, it, expect } from 'vitest';
import { mapHostProperties } from '../../../src/mappers/host-mapper.js';

describe('mapHostProperties', () => {
  it('should map host properties correctly', () => {
    const moRef = { type: 'HostSystem', value: 'host-1' };
    const propSet = [
      { name: 'name', val: 'esxi-host-01' },
      { name: 'runtime.connectionState', val: 'connected' },
      { name: 'runtime.powerState', val: 'poweredOn' },
      { name: 'summary.hardware.cpuModel', val: 'Intel Xeon E5-2680' },
      { name: 'summary.hardware.cpuMhz', val: '2400' },
      { name: 'summary.hardware.numCpuCores', val: '16' },
      { name: 'summary.hardware.memorySize', val: '68719476736' },
      {
        name: 'parent',
        val: { attributes: { type: 'ClusterComputeResource' }, $value: 'domain-c1' },
      },
    ];

    const host = mapHostProperties(moRef, propSet);

    expect(host.moRef).toEqual(moRef);
    expect(host.name).toBe('esxi-host-01');
    expect(host.connectionState).toBe('connected');
    expect(host.powerState).toBe('poweredOn');
    expect(host.cpuModel).toBe('Intel Xeon E5-2680');
    expect(host.cpuMhz).toBe(2400);
    expect(host.numCpuCores).toBe(16);
    expect(host.memoryBytes).toBe(68719476736);
    expect(host.parentRef).toEqual({ type: 'ClusterComputeResource', value: 'domain-c1' });
  });

  it('should handle disconnected state', () => {
    const moRef = { type: 'HostSystem', value: 'host-2' };
    const propSet = [
      { name: 'name', val: 'esxi-host-02' },
      { name: 'runtime.connectionState', val: 'disconnected' },
      { name: 'runtime.powerState', val: 'unknown' },
    ];

    const host = mapHostProperties(moRef, propSet);
    expect(host.connectionState).toBe('disconnected');
    expect(host.powerState).toBe('unknown');
    expect(host.parentRef).toBeUndefined();
  });

  it('should default to notResponding for unknown connection state', () => {
    const moRef = { type: 'HostSystem', value: 'host-3' };
    const propSet = [
      { name: 'name', val: 'esxi-host-03' },
      { name: 'runtime.connectionState', val: 'somethingElse' },
    ];

    const host = mapHostProperties(moRef, propSet);
    expect(host.connectionState).toBe('notResponding');
  });
});
