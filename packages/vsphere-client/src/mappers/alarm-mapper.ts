import type { VsphereAlarm, AlarmStatus } from '../types/models.js';
import { toMoRef, toString, toDate, toBool, ensureArray } from './common.js';

export function mapAlarms(raw: unknown): VsphereAlarm[] {
  if (!raw) return [];
  const items = ensureArray(raw);
  return items.map(mapAlarm);
}

function mapAlarm(raw: unknown): VsphereAlarm {
  const obj = raw as Record<string, unknown>;

  return {
    moRef: toMoRef(obj.key ?? obj),
    alarmRef: toMoRef(obj.alarm),
    entityRef: toMoRef(obj.entity),
    entityName: toString(obj.entityName),
    alarmName: toString(obj.alarmName || obj.alarm),
    status: mapAlarmStatus(obj.overallStatus || obj.status),
    time: toDate(obj.time) ?? new Date(),
    acknowledged: toBool(obj.acknowledged),
  };
}

function mapAlarmStatus(raw: unknown): AlarmStatus {
  const s = toString(raw);
  if (s === 'red') return 'red';
  if (s === 'yellow') return 'yellow';
  if (s === 'green') return 'green';
  return 'gray';
}
