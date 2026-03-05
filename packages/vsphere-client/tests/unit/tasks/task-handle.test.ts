import { describe, it, expect, vi } from 'vitest';
import { TaskHandle } from '../../../src/tasks/task-handle.js';
import { TaskEngine } from '../../../src/tasks/task-engine.js';
import { VsphereError, VsphereErrorCode } from '../../../src/types/errors.js';
import { noopLogger } from '../../../src/utils/logger.js';

function createMockEngine(states: Array<{ state: string; progress?: number; errorMessage?: string }>) {
  const callFn = vi.fn();
  const engine = new TaskEngine(callFn, noopLogger);
  let callIndex = 0;

  vi.spyOn(engine, 'getTaskInfo').mockImplementation(async (ref) => {
    const s = states[Math.min(callIndex++, states.length - 1)];
    return {
      moRef: ref,
      name: 'TestTask',
      state: s.state as 'queued' | 'running' | 'success' | 'error',
      progress: s.progress,
      errorMessage: s.errorMessage,
    };
  });

  return engine;
}

describe('TaskHandle', () => {
  it('should return status', async () => {
    const engine = createMockEngine([{ state: 'running', progress: 50 }]);
    const handle = new TaskHandle({ type: 'Task', value: 'task-1' }, engine);

    const status = await handle.status();
    expect(status.state).toBe('running');
    expect(status.progress).toBe(50);
  });

  it('should wait for completion', async () => {
    const engine = createMockEngine([
      { state: 'running', progress: 25 },
      { state: 'running', progress: 75 },
      { state: 'success' },
    ]);
    const handle = new TaskHandle({ type: 'Task', value: 'task-1' }, engine);

    const result = await handle.wait({ pollIntervalMs: 10 });
    expect(result.state).toBe('success');
  });

  it('should throw on task error', async () => {
    const engine = createMockEngine([
      { state: 'error', errorMessage: 'Out of disk space' },
    ]);
    const handle = new TaskHandle({ type: 'Task', value: 'task-1' }, engine);

    await expect(handle.wait({ pollIntervalMs: 10 })).rejects.toThrow(VsphereError);
    try {
      await handle.wait({ pollIntervalMs: 10 });
    } catch (err) {
      expect(err).toBeInstanceOf(VsphereError);
      expect((err as VsphereError).code).toBe(VsphereErrorCode.TASK_FAILED);
    }
  });

  it('should throw on timeout', async () => {
    const engine = createMockEngine([
      { state: 'running', progress: 10 },
      { state: 'running', progress: 20 },
      { state: 'running', progress: 30 },
    ]);
    const handle = new TaskHandle({ type: 'Task', value: 'task-1' }, engine);

    await expect(
      handle.wait({ timeoutMs: 50, pollIntervalMs: 20 }),
    ).rejects.toThrow(VsphereError);
  });

  it('should call onProgress callback', async () => {
    const engine = createMockEngine([
      { state: 'running', progress: 25 },
      { state: 'running', progress: 50 },
      { state: 'success' },
    ]);
    const handle = new TaskHandle({ type: 'Task', value: 'task-1' }, engine);

    const progressValues: number[] = [];
    await handle.wait({
      pollIntervalMs: 10,
      onProgress: (p) => progressValues.push(p),
    });

    expect(progressValues).toContain(25);
    expect(progressValues).toContain(50);
  });
});
