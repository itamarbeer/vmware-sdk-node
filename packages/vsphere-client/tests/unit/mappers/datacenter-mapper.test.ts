import { describe, it, expect } from 'vitest';
import { mapDatacenterProperties } from '../../../src/mappers/datacenter-mapper.js';

describe('mapDatacenterProperties', () => {
  it('should map datacenter properties correctly', () => {
    const moRef = { type: 'Datacenter', value: 'dc-1' };
    const propSet = [{ name: 'name', val: 'DC-Production' }];

    const dc = mapDatacenterProperties(moRef, propSet);
    expect(dc.moRef).toEqual(moRef);
    expect(dc.name).toBe('DC-Production');
  });

  it('should handle empty name', () => {
    const moRef = { type: 'Datacenter', value: 'dc-2' };
    const propSet: Array<{ name: string; val: unknown }> = [];

    const dc = mapDatacenterProperties(moRef, propSet);
    expect(dc.name).toBe('');
  });
});
