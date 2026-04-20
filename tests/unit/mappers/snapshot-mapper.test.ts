import { describe, it, expect } from 'vitest';
import { mapSnapshotTree } from '../../../src/mappers/snapshot-mapper.js';

describe('mapSnapshotTree', () => {
  it('should return empty array for null/undefined', () => {
    expect(mapSnapshotTree(null)).toEqual([]);
    expect(mapSnapshotTree(undefined)).toEqual([]);
  });

  it('should map a single snapshot', () => {
    const raw = {
      snapshot: { attributes: { type: 'VirtualMachineSnapshot' }, $value: 'snap-1' },
      name: 'Before upgrade',
      description: 'System state before upgrade',
      createTime: '2024-01-15T10:30:00Z',
      state: 'poweredOn',
      quiesced: 'false',
    };

    const result = mapSnapshotTree(raw);
    expect(result).toHaveLength(1);
    expect(result[0].moRef).toEqual({ type: 'VirtualMachineSnapshot', value: 'snap-1' });
    expect(result[0].name).toBe('Before upgrade');
    expect(result[0].description).toBe('System state before upgrade');
    expect(result[0].state).toBe('poweredOn');
    expect(result[0].quiesced).toBe(false);
    expect(result[0].children).toEqual([]);
  });

  it('should map nested snapshot tree', () => {
    const raw = [
      {
        snapshot: { attributes: { type: 'VirtualMachineSnapshot' }, $value: 'snap-1' },
        name: 'Root snapshot',
        description: '',
        createTime: '2024-01-15T10:00:00Z',
        state: 'poweredOn',
        quiesced: false,
        childSnapshotList: {
          snapshot: { attributes: { type: 'VirtualMachineSnapshot' }, $value: 'snap-2' },
          name: 'Child snapshot',
          description: 'Nested',
          createTime: '2024-01-15T11:00:00Z',
          state: 'poweredOff',
          quiesced: true,
        },
      },
    ];

    const result = mapSnapshotTree(raw);
    expect(result).toHaveLength(1);
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children[0].name).toBe('Child snapshot');
    expect(result[0].children[0].moRef.value).toBe('snap-2');
  });
});
