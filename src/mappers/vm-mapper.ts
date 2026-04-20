import type { VmSummary, VmDiskInfo, PowerState } from '../types/models.js';
import type { MoRef } from '../types/mo-ref.js';
import { toMoRef, toString, toNumber, toBool, propsToMap, ensureArray } from './common.js';

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
    overallCpuUsage: toNumber(props['summary.quickStats.overallCpuUsage']),
    guestMemoryUsageMB: toNumber(props['summary.quickStats.guestMemoryUsage']),
    storageCommitted: toNumber(props['summary.storage.committed']),
    storageUncommitted: toNumber(props['summary.storage.uncommitted']),
    hasSnapshot: props['snapshot'] != null,
    annotation: toString(props['config.annotation']) || undefined,
    toolsStatus: toString(props['guest.toolsStatus']) || undefined,
    toolsVersionStatus: toString(props['guest.toolsVersionStatus2']) || undefined,
    hardwareVersion: toString(props['config.version']) || undefined,
    uptimeSeconds: toNumber(props['summary.quickStats.uptimeSeconds']),
    disks: parseDisks(props['config.hardware.device'], props['layoutEx']),
    parentRef: props['parent'] ? toMoRef(props['parent']) : undefined,
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
  'config.hardware.device',
  'config.template',
  'config.uuid',
  'config.annotation',
  'config.version',
  'guest.ipAddress',
  'guest.toolsStatus',
  'guest.toolsVersionStatus2',
  'summary.quickStats.overallCpuUsage',
  'summary.quickStats.guestMemoryUsage',
  'summary.quickStats.uptimeSeconds',
  'summary.storage.committed',
  'summary.storage.uncommitted',
  'snapshot',
  'layoutEx',
  'parent',
];

function parseDisks(deviceRaw: unknown, layoutExRaw: unknown): VmDiskInfo[] {
  if (!deviceRaw) return [];
  // SOAP wraps typed arrays — unwrap VirtualDevice wrapper
  const raw = deviceRaw as Record<string, unknown>;
  const unwrapped = raw.VirtualDevice || deviceRaw;
  const devices = ensureArray(unwrapped as Record<string, unknown>[]);

  // Build layoutEx file size map: fileKey → size in bytes
  const fileSizeMap = new Map<number, number>();
  const layoutDiskMap = new Map<number, number>(); // device key → used bytes
  if (layoutExRaw && typeof layoutExRaw === 'object') {
    const lex = layoutExRaw as Record<string, unknown>;
    for (const f of ensureArray(lex.file as Record<string, unknown>[])) {
      fileSizeMap.set(toNumber(f.key), toNumber(f.size));
    }
    for (const d of ensureArray(lex.disk as Record<string, unknown>[])) {
      const dKey = toNumber(d.key);
      let used = 0;
      for (const chain of ensureArray(d.chain as Record<string, unknown>[])) {
        for (const fk of ensureArray(chain.fileKey as unknown[])) {
          used += fileSizeMap.get(toNumber(fk)) || 0;
        }
      }
      layoutDiskMap.set(dKey, used);
    }
  }

  const disks: VmDiskInfo[] = [];
  for (const dev of devices) {
    if (!dev || typeof dev !== 'object') continue;
    // VirtualDisk has capacityInKB or capacityInBytes
    const cap = toNumber((dev as Record<string, unknown>).capacityInKB);
    if (!cap) continue; // not a disk device
    const key = toNumber((dev as Record<string, unknown>).key);
    const info = (dev as Record<string, unknown>).deviceInfo as Record<string, unknown> | undefined;
    const label = info ? toString(info.label) : `Disk ${disks.length + 1}`;
    const backing = (dev as Record<string, unknown>).backing as Record<string, unknown> | undefined;
    const fileName = backing ? toString(backing.fileName) : '';
    const thinProvisioned = backing ? toBool(backing.thinProvisioned) : false;
    disks.push({
      label,
      capacityBytes: cap * 1024,
      usedBytes: layoutDiskMap.get(key) ?? 0,
      fileName,
      thinProvisioned,
    });
  }
  return disks;
}
