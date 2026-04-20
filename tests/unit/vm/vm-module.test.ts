import { describe, it, expect, vi } from 'vitest';
import { VmModule } from '../../../src/vm/vm-module.js';
import { noopLogger } from '../../../src/utils/logger.js';
import type { TaskEngine } from '../../../src/tasks/task-engine.js';
import type { MoRef } from '../../../src/types/mo-ref.js';

function createMocks() {
  const callFn = vi.fn().mockResolvedValue({
    returnval: { attributes: { type: 'Task' }, $value: 'task-42' },
  });
  const taskHandle = { moRef: { type: 'Task', value: 'task-42' } };
  const taskEngine = {
    handleTaskResponse: vi.fn().mockReturnValue(taskHandle),
  } as unknown as TaskEngine;

  const vm = new VmModule(callFn, taskEngine, noopLogger);
  return { callFn, taskEngine, vm, taskHandle };
}

describe('VmModule', () => {
  describe('clone', () => {
    it('should call CloneVM_Task with correct args', async () => {
      const { callFn, taskEngine, vm, taskHandle } = createMocks();
      const vmId: MoRef = { type: 'VirtualMachine', value: 'vm-1' };
      const folder: MoRef = { type: 'Folder', value: 'folder-1' };

      const result = await vm.clone(vmId, { name: 'my-clone', folder });

      expect(callFn).toHaveBeenCalledWith('CloneVM_Task', {
        _this: vmId,
        folder,
        name: 'my-clone',
        spec: {
          location: {},
          powerOn: false,
          template: false,
        },
      });
      expect(taskEngine.handleTaskResponse).toHaveBeenCalled();
      expect(result).toBe(taskHandle);
    });

    it('should include datastore and resourcePool in location when provided', async () => {
      const { callFn, vm } = createMocks();
      const vmId: MoRef = { type: 'VirtualMachine', value: 'vm-1' };
      const folder: MoRef = { type: 'Folder', value: 'folder-1' };
      const datastore: MoRef = { type: 'Datastore', value: 'ds-1' };
      const resourcePool: MoRef = { type: 'ResourcePool', value: 'rp-1' };

      await vm.clone(vmId, {
        name: 'my-clone',
        folder,
        datastore,
        resourcePool,
        powerOn: true,
        asTemplate: true,
      });

      expect(callFn).toHaveBeenCalledWith('CloneVM_Task', {
        _this: vmId,
        folder,
        name: 'my-clone',
        spec: {
          location: { datastore, pool: resourcePool },
          powerOn: true,
          template: true,
        },
      });
    });
  });

  describe('destroy', () => {
    it('should call Destroy_Task with correct args', async () => {
      const { callFn, taskEngine, vm, taskHandle } = createMocks();
      const vmId: MoRef = { type: 'VirtualMachine', value: 'vm-2' };

      const result = await vm.destroy(vmId);

      expect(callFn).toHaveBeenCalledWith('Destroy_Task', { _this: vmId });
      expect(taskEngine.handleTaskResponse).toHaveBeenCalled();
      expect(result).toBe(taskHandle);
    });
  });

  describe('unregister', () => {
    it('should call UnregisterVM with correct args', async () => {
      const { callFn, vm } = createMocks();
      const vmId: MoRef = { type: 'VirtualMachine', value: 'vm-3' };

      await vm.unregister(vmId);

      expect(callFn).toHaveBeenCalledWith('UnregisterVM', { _this: vmId });
    });

    it('should return void', async () => {
      const { vm } = createMocks();
      const vmId: MoRef = { type: 'VirtualMachine', value: 'vm-3' };

      const result = await vm.unregister(vmId);

      expect(result).toBeUndefined();
    });
  });
});
