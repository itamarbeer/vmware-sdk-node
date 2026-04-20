import type { VsphereTask } from '../types/models.js';
import type { MoRef } from '../types/mo-ref.js';
import type { Logger } from '../types/config.js';
import { VsphereError, VsphereErrorCode } from '../types/errors.js';
import { mapTaskInfo } from '../mappers/task-mapper.js';
import { toMoRef, ensureArray } from '../mappers/common.js';
import { TaskHandle } from './task-handle.js';

/** Function signature for making SOAP calls to vCenter. */
export type CallFn = <T>(method: string, args: Record<string, unknown>) => Promise<T>;

/** Manages vSphere task lifecycle: creation, status retrieval, and cancellation. */
export class TaskEngine {
  private readonly callFn: CallFn;
  private readonly logger: Logger;
  private propertyCollectorRef: MoRef | null = null;

  constructor(callFn: CallFn, logger: Logger) {
    this.callFn = callFn;
    this.logger = logger;
  }

  setPropertyCollector(ref: MoRef): void {
    this.propertyCollectorRef = ref;
  }

  /**
   * Retrieves current task info via the PropertyCollector.
   * @param taskRef - Task managed object reference.
   */
  async getTaskInfo(taskRef: MoRef): Promise<VsphereTask> {
    if (!this.propertyCollectorRef) {
      throw new VsphereError('PropertyCollector not initialized', VsphereErrorCode.CONNECTION_FAILED);
    }

    const result = await this.callFn<Record<string, unknown>>('RetrievePropertiesEx', {
      _this: this.propertyCollectorRef,
      specSet: [
        {
          propSet: [{ type: 'Task', pathSet: ['info'] }],
          objectSet: [{ obj: taskRef, skip: false }],
        },
      ],
      options: { maxObjects: 1 },
    });

    const returnval = (result as Record<string, unknown>)?.returnval as Record<string, unknown> | undefined;
    const objects = ensureArray(
      (returnval?.objects) ?? returnval
    );

    if (objects.length === 0) {
      return {
        moRef: taskRef,
        name: 'unknown',
        state: 'queued',
      };
    }

    const obj = objects[0] as Record<string, unknown>;
    const propSet = ensureArray(obj.propSet) as Array<{ name: string; val: unknown }>;

    const info = propSet.find((p) => p.name === 'info');
    if (info && typeof info.val === 'object' && info.val !== null) {
      return mapTaskInfo(taskRef, info.val as Record<string, unknown>);
    }

    return { moRef: taskRef, name: 'unknown', state: 'queued' };
  }

  /**
   * Sends a cancel request for the given task.
   * @param taskRef - Task to cancel.
   */
  async cancelTask(taskRef: MoRef): Promise<void> {
    this.logger.info(`Cancelling task ${taskRef.value}`);
    await this.callFn('CancelTask', { _this: taskRef });
  }

  createHandle(taskRef: MoRef): TaskHandle {
    this.logger.debug(`Created task handle for ${taskRef.value}`);
    return new TaskHandle(taskRef, this);
  }

  /**
   * Extracts the task MoRef from a SOAP response and returns a {@link TaskHandle}.
   * @param response - Raw SOAP response containing the task reference.
   */
  handleTaskResponse(response: unknown): TaskHandle {
    const ref = extractTaskRef(response);
    return this.createHandle(ref);
  }
}

function extractTaskRef(response: unknown): MoRef {
  if (!response || typeof response !== 'object') {
    return { type: 'Task', value: String(response) };
  }

  const obj = response as Record<string, unknown>;
  const returnval = obj.returnval ?? obj;
  return toMoRef(returnval);
}
