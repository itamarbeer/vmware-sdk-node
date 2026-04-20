import { describe, it, expect } from 'vitest';
import { mapTaskInfo } from '../../../src/mappers/task-mapper.js';

describe('mapTaskInfo', () => {
  it('should map a successful task', () => {
    const taskRef = { type: 'Task', value: 'task-1' };
    const info = {
      name: 'CreateSnapshot_Task',
      entity: { attributes: { type: 'VirtualMachine' }, $value: 'vm-1' },
      state: 'success',
      progress: 100,
      startTime: '2024-01-15T10:00:00Z',
      completeTime: '2024-01-15T10:01:00Z',
    };

    const task = mapTaskInfo(taskRef, info);
    expect(task.moRef).toEqual(taskRef);
    expect(task.name).toBe('CreateSnapshot_Task');
    expect(task.state).toBe('success');
    expect(task.progress).toBe(100);
    expect(task.entityRef).toEqual({ type: 'VirtualMachine', value: 'vm-1' });
    expect(task.startTime).toBeInstanceOf(Date);
    expect(task.completeTime).toBeInstanceOf(Date);
    expect(task.errorMessage).toBeUndefined();
  });

  it('should map a failed task with error', () => {
    const taskRef = { type: 'Task', value: 'task-2' };
    const info = {
      name: 'PowerOnVM_Task',
      state: 'error',
      error: {
        localizedMessage: 'Insufficient resources to power on VM',
      },
    };

    const task = mapTaskInfo(taskRef, info);
    expect(task.state).toBe('error');
    expect(task.errorMessage).toBe('Insufficient resources to power on VM');
  });

  it('should map a queued task', () => {
    const taskRef = { type: 'Task', value: 'task-3' };
    const info = { name: 'ReconfigVM_Task', state: 'queued' };

    const task = mapTaskInfo(taskRef, info);
    expect(task.state).toBe('queued');
    expect(task.progress).toBeUndefined();
  });

  it('should handle error with nested fault', () => {
    const taskRef = { type: 'Task', value: 'task-4' };
    const info = {
      name: 'MigrateVM_Task',
      state: 'error',
      error: {
        fault: { msg: 'Migration failed due to incompatible host' },
      },
    };

    const task = mapTaskInfo(taskRef, info);
    expect(task.errorMessage).toContain('Migration failed');
  });
});
