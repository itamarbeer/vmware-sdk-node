import type { VmSummary, PowerState } from '../types/models.js';
import type { MoRef } from '../types/mo-ref.js';
import { toMoRef, toString, toNumber, toBool, propsToMap } from './common.js';

export function mapVmProperties(obj: MoRef, propSet: Array<{ name: string; val: unknown }>): VmSummary {
  const props = propsToMap(propSet);

  return {
    moRef: obj,
    name: toString(props['name']),
    powerState: mapPowerState(props['runtime.powerState'] ?? props['summary.runtime.powerState']),
    guestId: toString(props['config.guestId'] || props['summary.config.guestId']) || undefined,
    guestFullName: toString(props['config.guestFullName'] || props['summary.config.guestFullName']) || undefined,
    numCpu: toNumber(props['config.hardware.numCPU'] || props['summary.config.numCpu']),
    memoryMB: toNumber(props['config.hardware.memoryMB'] || props['summary.config.memorySizeMB']),
    ipAddress: toString(props['guest.ipAddress'] || props['summary.guest.ipAddress']) || undefined,
    hostRef: props['runtime.host'] ? toMoRef(props['runtime.host']) : undefined,
    template: toBool(props['config.template'] || props['summary.config.template']),
    uuid: toString(props['config.uuid'] || props['summary.config.uuid']),
  };
}

function mapPowerState(raw: unknown): PowerState {
  const s = toString(raw);
  if (s === 'poweredOn') return 'poweredOn';
  if (s === 'poweredOff') return 'poweredOff';
  if (s === 'suspended') return 'suspended';
  return 'poweredOff';
}

export const VM_PROPERTY_PATHS = [
  'name',
  'runtime.powerState',
  'runtime.host',
  'config.guestId',
  'config.guestFullName',
  'config.hardware.numCPU',
  'config.hardware.memoryMB',
  'config.template',
  'config.uuid',
  'guest.ipAddress',
];
