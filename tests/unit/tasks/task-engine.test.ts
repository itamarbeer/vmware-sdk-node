import { describe, it, expect, vi } from 'vitest';
import { TaskEngine } from '../../../src/tasks/task-engine.js';
import { VsphereError, VsphereErrorCode } from '../../../src/types/errors.js';
import { noopLogger } from '../../../src/utils/logger.js';

describe('TaskEngine', () => {
  it('should throw VsphereError when PropertyCollector not initialized', async () => {
    const callFn = vi.fn();
    const engine = new TaskEngine(callFn, noopLogger);

    await expect(
      engine.getTaskInfo({ type: 'Task', value: 'task-1' }),
    ).rejects.toThrow(VsphereError);

    try {
      await engine.getTaskInfo({ type: 'Task', value: 'task-1' });
    } catch (err) {
      expect((err as VsphereError).code).toBe(VsphereErrorCode.CONNECTION_FAILED);
    }
  });

  it('should create a TaskHandle from response', () => {
    const callFn = vi.fn();
    const engine = new TaskEngine(callFn, noopLogger);
    engine.setPropertyCollector({ type: 'PropertyCollector', value: 'pc-1' });

    const handle = engine.handleTaskResponse({
      returnval: { attributes: { type: 'Task' }, $value: 'task-123' },
    });

    expect(handle.moRef).toEqual({ type: 'Task', value: 'task-123' });
  });

  it('should call CancelTask', async () => {
    const callFn = vi.fn().mockResolvedValue({});
    const engine = new TaskEngine(callFn, noopLogger);

    await engine.cancelTask({ type: 'Task', value: 'task-1' });
    expect(callFn).toHaveBeenCalledWith('CancelTask', {
      _this: { type: 'Task', value: 'task-1' },
    });
  });
});
