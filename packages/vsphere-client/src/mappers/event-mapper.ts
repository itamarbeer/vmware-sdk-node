import type { VsphereEvent } from '../types/models.js';
import { toMoRef, toString, toDate, toNumber, ensureArray } from './common.js';

export function mapEvents(raw: unknown): VsphereEvent[] {
  if (!raw) return [];
  const items = ensureArray(raw);
  return items.map(mapEvent);
}

function mapEvent(raw: unknown): VsphereEvent {
  const obj = raw as Record<string, unknown>;

  let entityRef;
  let entityName;
  if (obj.vm && typeof obj.vm === 'object') {
    const vm = obj.vm as Record<string, unknown>;
    entityRef = vm.vm ? toMoRef(vm.vm) : undefined;
    entityName = toString(vm.name);
  } else if (obj.host && typeof obj.host === 'object') {
    const host = obj.host as Record<string, unknown>;
    entityRef = host.host ? toMoRef(host.host) : undefined;
    entityName = toString(host.name);
  }

  let datacenterRef;
  if (obj.datacenter && typeof obj.datacenter === 'object') {
    const dc = obj.datacenter as Record<string, unknown>;
    datacenterRef = dc.datacenter ? toMoRef(dc.datacenter) : undefined;
  }

  return {
    key: toNumber(obj.key),
    eventType: toString(obj.eventTypeId || obj.$type || obj.type || 'Unknown'),
    createdTime: toDate(obj.createdTime) ?? new Date(),
    message: toString(obj.fullFormattedMessage || obj.message),
    userName: toString(obj.userName) || undefined,
    entityRef,
    entityName,
    datacenterRef,
  };
}
