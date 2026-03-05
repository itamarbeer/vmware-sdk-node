import { describe, it, expect } from 'vitest';
import { mapAlarms } from '../../../src/mappers/alarm-mapper.js';

describe('mapAlarms', () => {
  it('should return empty array for null', () => {
    expect(mapAlarms(null)).toEqual([]);
  });

  it('should map alarms correctly', () => {
    const raw = [
      {
        key: { attributes: { type: 'AlarmState' }, $value: 'alarm-state-1' },
        alarm: { attributes: { type: 'Alarm' }, $value: 'alarm-1' },
        entity: { attributes: { type: 'HostSystem' }, $value: 'host-1' },
        entityName: 'esxi-host-01',
        alarmName: 'Host CPU usage',
        overallStatus: 'yellow',
        time: '2024-01-15T10:30:00Z',
        acknowledged: false,
      },
    ];

    const alarms = mapAlarms(raw);
    expect(alarms).toHaveLength(1);
    expect(alarms[0].moRef).toEqual({ type: 'AlarmState', value: 'alarm-state-1' });
    expect(alarms[0].alarmRef).toEqual({ type: 'Alarm', value: 'alarm-1' });
    expect(alarms[0].entityRef).toEqual({ type: 'HostSystem', value: 'host-1' });
    expect(alarms[0].entityName).toBe('esxi-host-01');
    expect(alarms[0].status).toBe('yellow');
    expect(alarms[0].acknowledged).toBe(false);
  });
});
