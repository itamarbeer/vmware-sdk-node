import type { DatastoreSummary } from '../types/models.js';
import type { MoRef } from '../types/mo-ref.js';
import { toString, toNumber, toBool, propsToMap } from './common.js';

export function mapDatastoreProperties(
  obj: MoRef,
  propSet: Array<{ name: string; val: unknown }>,
): DatastoreSummary {
  const props = propsToMap(propSet);
  return {
    moRef: obj,
    name: toString(props['summary.name'] || props['name']),
    type: toString(props['summary.type']),
    capacityBytes: toNumber(props['summary.capacity']),
    freeSpaceBytes: toNumber(props['summary.freeSpace']),
    accessible: toBool(props['summary.accessible'], true),
  };
}

export const DATASTORE_PROPERTY_PATHS = [
  'name',
  'summary.name',
  'summary.type',
  'summary.capacity',
  'summary.freeSpace',
  'summary.accessible',
];
