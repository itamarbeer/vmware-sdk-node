import { describe, it, expect } from 'vitest';
import { mapEvents } from '../../../src/mappers/event-mapper.js';

describe('mapEvents', () => {
  it('should return empty array for null', () => {
    expect(mapEvents(null)).toEqual([]);
  });

  it('should map events correctly', () => {
    const raw = [
      {
        key: 12345,
        eventTypeId: 'VmPoweredOnEvent',
        createdTime: '2024-01-15T10:30:00Z',
        fullFormattedMessage: 'VM test-vm powered on',
        userName: 'admin',
        vm: {
          vm: { attributes: { type: 'VirtualMachine' }, $value: 'vm-1' },
          name: 'test-vm',
        },
        datacenter: {
          datacenter: { attributes: { type: 'Datacenter' }, $value: 'dc-1' },
          name: 'DC1',
        },
      },
    ];

    const events = mapEvents(raw);
    expect(events).toHaveLength(1);
    expect(events[0].key).toBe(12345);
    expect(events[0].eventType).toBe('VmPoweredOnEvent');
    expect(events[0].message).toBe('VM test-vm powered on');
    expect(events[0].userName).toBe('admin');
    expect(events[0].entityRef).toEqual({ type: 'VirtualMachine', value: 'vm-1' });
    expect(events[0].entityName).toBe('test-vm');
    expect(events[0].datacenterRef).toEqual({ type: 'Datacenter', value: 'dc-1' });
  });
});
