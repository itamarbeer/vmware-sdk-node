import type { MoRef } from '../types/mo-ref.js';

/** Convert a MoRef to the soap library's XML attribute format. */
export function toSoapMoRef(ref: MoRef): { attributes: { type: string }; $value: string } {
  return { attributes: { type: ref.type }, $value: ref.value };
}

/** Recursively convert MoRef objects in SOAP call args to soap library format. */
export function prepareSoapArgs(args: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(args)) {
    result[key] = convertValue(val);
  }
  return result;
}

function convertValue(val: unknown): unknown {
  if (!val || typeof val !== 'object') return val;
  if (Array.isArray(val)) return val.map(convertValue);
  const obj = val as Record<string, unknown>;
  if ('type' in obj && 'value' in obj && Object.keys(obj).length === 2) {
    return toSoapMoRef(obj as unknown as MoRef);
  }
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    result[k] = convertValue(v);
  }
  return result;
}

export function toMoRef(raw: unknown): MoRef {
  if (!raw || typeof raw !== 'object') {
    return { type: 'unknown', value: String(raw) };
  }

  const obj = raw as Record<string, unknown>;

  // soap package format: { attributes: { type: "..." }, $value: "..." }
  if (obj.attributes && typeof obj.attributes === 'object' && '$value' in obj) {
    const attrs = obj.attributes as Record<string, string>;
    return { type: attrs.type || 'unknown', value: String(obj.$value) };
  }

  // Direct format: { type: "...", value: "..." }
  if ('type' in obj && 'value' in obj) {
    return { type: String(obj.type), value: String(obj.value) };
  }

  // Fallback: use _ and $value or string representation
  if ('_' in obj) {
    return { type: String((obj as Record<string, unknown>).type ?? 'unknown'), value: String(obj._) };
  }

  return { type: 'unknown', value: String(raw) };
}

export function toDate(raw: unknown): Date | undefined {
  if (!raw) return undefined;
  if (raw instanceof Date) return raw;
  const d = new Date(String(raw));
  return isNaN(d.getTime()) ? undefined : d;
}

export function toString(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  return String(raw);
}

export function toNumber(raw: unknown, fallback = 0): number {
  if (raw === null || raw === undefined) return fallback;
  const n = Number(raw);
  return isNaN(n) ? fallback : n;
}

export function toBool(raw: unknown, fallback = false): boolean {
  if (raw === null || raw === undefined) return fallback;
  if (typeof raw === 'boolean') return raw;
  return raw === 'true' || raw === '1';
}

export function ensureArray<T>(val: T | T[] | undefined | null): T[] {
  if (val === undefined || val === null) return [];
  return Array.isArray(val) ? val : [val];
}

export interface ObjectContent {
  obj: MoRef;
  propSet: Array<{ name: string; val: unknown }>;
}

export function propsToMap(propSet: Array<{ name: string; val: unknown }>): Record<string, unknown> {
  const map: Record<string, unknown> = {};
  for (const p of propSet) {
    map[p.name] = p.val;
  }
  return map;
}
