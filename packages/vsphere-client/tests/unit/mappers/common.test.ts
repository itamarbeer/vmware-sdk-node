import { describe, it, expect } from 'vitest';
import { toMoRef, toDate, toString, toNumber, toBool, ensureArray, propsToMap } from '../../../src/mappers/common.js';

describe('toMoRef', () => {
  it('should parse soap format with attributes', () => {
    const raw = { attributes: { type: 'VirtualMachine' }, $value: 'vm-123' };
    expect(toMoRef(raw)).toEqual({ type: 'VirtualMachine', value: 'vm-123' });
  });

  it('should parse direct format', () => {
    const raw = { type: 'HostSystem', value: 'host-1' };
    expect(toMoRef(raw)).toEqual({ type: 'HostSystem', value: 'host-1' });
  });

  it('should handle null/undefined', () => {
    expect(toMoRef(null)).toEqual({ type: 'unknown', value: 'null' });
    expect(toMoRef(undefined)).toEqual({ type: 'unknown', value: 'undefined' });
  });

  it('should handle _ format', () => {
    const raw = { _: 'vm-456', type: 'VirtualMachine' };
    expect(toMoRef(raw)).toEqual({ type: 'VirtualMachine', value: 'vm-456' });
  });
});

describe('toDate', () => {
  it('should parse ISO string', () => {
    const d = toDate('2024-01-15T10:30:00Z');
    expect(d).toBeInstanceOf(Date);
    expect(d!.toISOString()).toBe('2024-01-15T10:30:00.000Z');
  });

  it('should return undefined for null/undefined', () => {
    expect(toDate(null)).toBeUndefined();
    expect(toDate(undefined)).toBeUndefined();
  });

  it('should return undefined for invalid date', () => {
    expect(toDate('not-a-date')).toBeUndefined();
  });

  it('should pass through Date objects', () => {
    const d = new Date();
    expect(toDate(d)).toBe(d);
  });
});

describe('toString', () => {
  it('should convert values to string', () => {
    expect(toString('hello')).toBe('hello');
    expect(toString(42)).toBe('42');
    expect(toString(null)).toBe('');
    expect(toString(undefined)).toBe('');
  });
});

describe('toNumber', () => {
  it('should convert values to number', () => {
    expect(toNumber('42')).toBe(42);
    expect(toNumber(42)).toBe(42);
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined, -1)).toBe(-1);
    expect(toNumber('abc')).toBe(0);
  });
});

describe('toBool', () => {
  it('should convert values to boolean', () => {
    expect(toBool(true)).toBe(true);
    expect(toBool(false)).toBe(false);
    expect(toBool('true')).toBe(true);
    expect(toBool('false')).toBe(false);
    expect(toBool('1')).toBe(true);
    expect(toBool(null, true)).toBe(true);
    expect(toBool(undefined)).toBe(false);
  });
});

describe('ensureArray', () => {
  it('should wrap single values in array', () => {
    expect(ensureArray('hello')).toEqual(['hello']);
    expect(ensureArray(42)).toEqual([42]);
  });

  it('should pass arrays through', () => {
    expect(ensureArray([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('should return empty array for null/undefined', () => {
    expect(ensureArray(null)).toEqual([]);
    expect(ensureArray(undefined)).toEqual([]);
  });
});

describe('propsToMap', () => {
  it('should convert propSet to map', () => {
    const propSet = [
      { name: 'name', val: 'test-vm' },
      { name: 'runtime.powerState', val: 'poweredOn' },
    ];
    expect(propsToMap(propSet)).toEqual({
      name: 'test-vm',
      'runtime.powerState': 'poweredOn',
    });
  });
});
