import type { ClusterSummary } from '../types/models.js';
import type { MoRef } from '../types/mo-ref.js';
import { toMoRef, toString, toNumber, propsToMap } from './common.js';

export function mapClusterProperties(
  obj: MoRef,
  propSet: Array<{ name: string; val: unknown }>,
): ClusterSummary {
  const props = propsToMap(propSet);

  return {
    moRef: obj,
    name: toString(props['name']),
    numHosts: toNumber(props['summary.numHosts']),
    numEffectiveHosts: toNumber(props['summary.numEffectiveHosts']),
    totalCpu: toNumber(props['summary.totalCpu']),
    totalMemory: toNumber(props['summary.totalMemory']),
    parentRef: props['parent'] ? toMoRef(props['parent']) : undefined,
  };
}

export const CLUSTER_PROPERTY_PATHS = [
  'name',
  'summary.numHosts',
  'summary.numEffectiveHosts',
  'summary.totalCpu',
  'summary.totalMemory',
  'parent',
];
