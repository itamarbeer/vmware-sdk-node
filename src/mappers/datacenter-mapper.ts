import type { DatacenterSummary } from '../types/models.js';
import type { MoRef } from '../types/mo-ref.js';
import { toString, propsToMap } from './common.js';

export function mapDatacenterProperties(
  obj: MoRef,
  propSet: Array<{ name: string; val: unknown }>,
): DatacenterSummary {
  const props = propsToMap(propSet);
  return {
    moRef: obj,
    name: toString(props['name']),
  };
}

export const DATACENTER_PROPERTY_PATHS = ['name'];
