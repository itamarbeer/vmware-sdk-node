import type { HostSummary, ConnectionState, HostPowerState } from '../types/models.js';
import type { MoRef } from '../types/mo-ref.js';
import { toMoRef, toString, toNumber, propsToMap } from './common.js';

export function mapHostProperties(obj: MoRef, propSet: Array<{ name: string; val: unknown }>): HostSummary {
  const props = propsToMap(propSet);

  return {
    moRef: obj,
    name: toString(props['name']),
    connectionState: mapConnectionState(props['runtime.connectionState']),
    powerState: mapHostPowerState(props['runtime.powerState']),
    cpuModel: toString(props['summary.hardware.cpuModel']),
    cpuMhz: toNumber(props['summary.hardware.cpuMhz']),
    numCpuCores: toNumber(props['summary.hardware.numCpuCores']),
    memoryBytes: toNumber(props['summary.hardware.memorySize']),
    parentRef: props['parent'] ? toMoRef(props['parent']) : undefined,
  };
}

function mapConnectionState(raw: unknown): ConnectionState {
  const s = toString(raw);
  if (s === 'connected') return 'connected';
  if (s === 'disconnected') return 'disconnected';
  return 'notResponding';
}

function mapHostPowerState(raw: unknown): HostPowerState {
  const s = toString(raw);
  if (s === 'poweredOn') return 'poweredOn';
  if (s === 'standBy') return 'standBy';
  return 'unknown';
}

export const HOST_PROPERTY_PATHS = [
  'name',
  'runtime.connectionState',
  'runtime.powerState',
  'summary.hardware.cpuModel',
  'summary.hardware.cpuMhz',
  'summary.hardware.numCpuCores',
  'summary.hardware.memorySize',
  'parent',
];
