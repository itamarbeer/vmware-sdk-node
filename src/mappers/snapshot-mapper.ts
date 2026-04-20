import type { Snapshot, PowerState } from '../types/models.js';
import { toMoRef, toString, toDate, toBool, ensureArray } from './common.js';

export function mapSnapshotTree(raw: unknown): Snapshot[] {
  if (!raw) return [];
  // SOAP returns { VirtualMachineSnapshotTree: [...] } wrapper
  const obj = raw as Record<string, unknown>;
  if (obj.VirtualMachineSnapshotTree) {
    return ensureArray(obj.VirtualMachineSnapshotTree).map(mapSnapshotNode);
  }
  const items = ensureArray(raw);
  return items.map(mapSnapshotNode);
}

function mapSnapshotNode(raw: unknown): Snapshot {
  const obj = raw as Record<string, unknown>;
  return {
    moRef: toMoRef(obj.snapshot),
    name: toString(obj.name),
    description: toString(obj.description),
    createTime: toDate(obj.createTime) ?? new Date(),
    state: mapPowerState(obj.state),
    quiesced: toBool(obj.quiesced),
    children: mapSnapshotTree(obj.childSnapshotList),
  };
}

function mapPowerState(raw: unknown): PowerState {
  const s = toString(raw);
  if (s === 'poweredOn') return 'poweredOn';
  if (s === 'suspended') return 'suspended';
  return 'poweredOff';
}
