import { describe, it, expect } from 'vitest';
import { mapVmProperties } from '../../../src/mappers/vm-mapper.js';

describe('mapVmProperties', () => {
  it('should map VM properties correctly', () => {
    const moRef = { type: 'VirtualMachine', value: 'vm-123' };
    const propSet = [
      { name: 'name', val: 'test-vm-01' },
      { name: 'runtime.powerState', val: 'poweredOn' },
      { name: 'config.guestId', val: 'ubuntu64Guest' },
      { name: 'config.guestFullName', val: 'Ubuntu Linux (64-bit)' },
      { name: 'config.hardware.numCPU', val: '4' },
      { name: 'config.hardware.memoryMB', val: '8192' },
      { name: 'guest.ipAddress', val: '192.168.1.100' },
      { name: 'config.template', val: 'false' },
      { name: 'config.uuid', val: '42316d44-7b3a-1234-abcd-abcdef123456' },
      {
        name: 'runtime.host',
        val: { attributes: { type: 'HostSystem' }, $value: 'host-1' },
      },
    ];

    const vm = mapVmProperties(moRef, propSet);

    expect(vm.moRef).toEqual(moRef);
    expect(vm.name).toBe('test-vm-01');
    expect(vm.powerState).toBe('poweredOn');
    expect(vm.guestId).toBe('ubuntu64Guest');
    expect(vm.guestFullName).toBe('Ubuntu Linux (64-bit)');
    expect(vm.numCpu).toBe(4);
    expect(vm.memoryMB).toBe(8192);
    expect(vm.ipAddress).toBe('192.168.1.100');
    expect(vm.template).toBe(false);
    expect(vm.uuid).toBe('42316d44-7b3a-1234-abcd-abcdef123456');
    expect(vm.hostRef).toEqual({ type: 'HostSystem', value: 'host-1' });
  });

  it('should handle missing optional properties', () => {
    const moRef = { type: 'VirtualMachine', value: 'vm-456' };
    const propSet = [
      { name: 'name', val: 'minimal-vm' },
      { name: 'runtime.powerState', val: 'poweredOff' },
    ];

    const vm = mapVmProperties(moRef, propSet);

    expect(vm.name).toBe('minimal-vm');
    expect(vm.powerState).toBe('poweredOff');
    expect(vm.guestId).toBeUndefined();
    expect(vm.ipAddress).toBeUndefined();
    expect(vm.numCpu).toBe(0);
    expect(vm.memoryMB).toBe(0);
    expect(vm.hostRef).toBeUndefined();
  });

  it('should handle summary format properties', () => {
    const moRef = { type: 'VirtualMachine', value: 'vm-789' };
    const propSet = [
      { name: 'name', val: 'summary-vm' },
      { name: 'summary.runtime.powerState', val: 'suspended' },
      { name: 'summary.config.numCpu', val: '2' },
      { name: 'summary.config.memorySizeMB', val: '4096' },
    ];

    const vm = mapVmProperties(moRef, propSet);

    expect(vm.powerState).toBe('suspended');
    expect(vm.numCpu).toBe(2);
    expect(vm.memoryMB).toBe(4096);
  });
});
