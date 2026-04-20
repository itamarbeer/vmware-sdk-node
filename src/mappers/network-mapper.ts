import type { NetworkSummary } from '../types/models.js';
import type { MoRef } from '../types/mo-ref.js';
import { toString, toBool, propsToMap } from './common.js';

export function mapNetworkProperties(
  obj: MoRef,
  propSet: Array<{ name: string; val: unknown }>,
): NetworkSummary {
  const props = propsToMap(propSet);
  return {
    moRef: obj,
    name: toString(props['name']),
    accessible: toBool(props['summary.accessible'], true),
    ipPoolName: props['summary.ipPoolName'] ? toString(props['summary.ipPoolName']) : undefined,
  };
}

export const NETWORK_PROPERTY_PATHS = [
  'name',
  'summary.accessible',
  'summary.ipPoolName',
];
