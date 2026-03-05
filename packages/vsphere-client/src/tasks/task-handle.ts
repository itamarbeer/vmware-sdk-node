import type { VsphereTask } from '../types/models.js';
import type { MoRef } from '../types/mo-ref.js';
import { VsphereError, VsphereErrorCode } from '../types/errors.js';
import type { TaskEngine } from './task-engine.js';

/** Options for polling a task until completion. */
export interface TaskWaitOptions {
  /** Maximum time to wait in ms. Default: `300_000` (5 min). */
  timeoutMs?: number;
  /** Polling interval in ms. Default: `2_000`. */
  pollIntervalMs?: number;
  /** Callback invoked when task progress changes. */
  onProgress?: (progress: number) => void;
}

/** Handle to a running vSphere task, providing status polling, waiting, and cancellation. */
export class TaskHandle {
  /** Managed object reference of the task. */
  readonly moRef: MoRef;
  private _result: VsphereTask | null = null;
  private readonly engine: TaskEngine;

  constructor(moRef: MoRef, engine: TaskEngine) {
    this.moRef = moRef;
    this.engine = engine;
  }

  /** Fetches the current task state from vCenter. */
  async status(): Promise<VsphereTask> {
    const task = await this.engine.getTaskInfo(this.moRef);
    this._result = task;
    return task;
  }

  /**
   * Polls the task until it succeeds or fails. Throws {@link VsphereErrorCode.TASK_FAILED} on error, {@link VsphereErrorCode.TASK_TIMEOUT} on timeout.
   * @param opts - Timeout, polling interval, and progress callback.
   */
  async wait(opts?: TaskWaitOptions): Promise<VsphereTask> {
    const timeoutMs = opts?.timeoutMs ?? 300_000;
    const pollIntervalMs = opts?.pollIntervalMs ?? 2_000;
    const start = Date.now();
    let lastProgress = -1;

    while (true) {
      const task = await this.status();

      if (task.state === 'success' || task.state === 'error') {
        if (task.state === 'error') {
          throw new VsphereError(
            `Task ${task.name} failed: ${task.errorMessage ?? 'unknown error'}`,
            VsphereErrorCode.TASK_FAILED,
            { moRef: this.moRef },
          );
        }
        return task;
      }

      if (task.progress !== undefined && task.progress !== lastProgress) {
        lastProgress = task.progress;
        opts?.onProgress?.(task.progress);
      }

      if (Date.now() - start > timeoutMs) {
        throw new VsphereError(
          `Task ${task.name} timed out after ${timeoutMs}ms`,
          VsphereErrorCode.TASK_TIMEOUT,
          { moRef: this.moRef },
        );
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  }

  /** Requests cancellation of the task on vCenter. */
  async cancel(): Promise<void> {
    await this.engine.cancelTask(this.moRef);
  }

  /** Returns the last fetched task info, or `null` if status() has not been called. */
  get result(): VsphereTask | null {
    return this._result;
  }
}
