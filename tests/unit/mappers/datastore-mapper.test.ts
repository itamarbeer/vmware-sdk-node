import { describe, it, expect } from 'vitest';
import { mapDatastoreProperties } from '../../../src/mappers/datastore-mapper.js';

describe('mapDatastoreProperties', () => {
  it('should map datastore properties correctly', () => {
    const moRef = { type: 'Datastore', value: 'ds-1' };
    const propSet = [
      { name: 'name', val: 'datastore1' },
      { name: 'summary.name', val: 'datastore1' },
      { name: 'summary.type', val: 'VMFS' },
      { name: 'summary.capacity', val: '1099511627776' },
      { name: 'summary.freeSpace', val: '549755813888' },
      { name: 'summary.accessible', val: 'true' },
    ];

    const ds = mapDatastoreProperties(moRef, propSet);
    expect(ds.moRef).toEqual(moRef);
    expect(ds.name).toBe('datastore1');
    expect(ds.type).toBe('VMFS');
    expect(ds.capacityBytes).toBe(1099511627776);
    expect(ds.freeSpaceBytes).toBe(549755813888);
    expect(ds.accessible).toBe(true);
  });

  it('should handle inaccessible datastore', () => {
    const moRef = { type: 'Datastore', value: 'ds-2' };
    const propSet = [
      { name: 'name', val: 'offline-ds' },
      { name: 'summary.accessible', val: 'false' },
    ];

    const ds = mapDatastoreProperties(moRef, propSet);
    expect(ds.accessible).toBe(false);
  });
});
