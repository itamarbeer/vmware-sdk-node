import type { MoRef } from '../types/mo-ref.js';
import type { Logger } from '../types/config.js';
import type { TaskEngine, CallFn } from '../tasks/task-engine.js';
import type { TaskHandle } from '../tasks/task-handle.js';

/** Specification for reconfiguring a VM's CPU, memory, or annotations. */
export interface VmReconfigSpec {
  /** Number of virtual CPUs. */
  cpu?: number;
  /** Memory allocation in megabytes. */
  memoryMB?: number;
  /** VM annotation / notes. */
  notes?: string;
}

/** Options for cloning a virtual machine. */
export interface VmCloneOptions {
  /** Name for the cloned VM. */
  name: string;
  /** Destination folder for the clone. */
  folder: MoRef;
  /** Target resource pool. */
  resourcePool?: MoRef;
  /** Target datastore. */
  datastore?: MoRef;
  /** Power on the clone after creation. Default: `false`. */
  powerOn?: boolean;
  /** Mark the clone as a template. Default: `false`. */
  asTemplate?: boolean;
}

/** VM power operations, reconfiguration, cloning, and lifecycle management. */
export class VmModule {
  constructor(
    private readonly callFn: CallFn,
    private readonly taskEngine: TaskEngine,
    private readonly logger: Logger,
  ) {}

  /**
   * Powers on a virtual machine.
   * @param vmId - VM to power on.
   * @param hostId - Optional target host for the power-on.
   */
  async powerOn(vmId: MoRef, hostId?: MoRef): Promise<TaskHandle> {
    this.logger.info(`Powering on VM ${vmId.value}`);
    const args: Record<string, unknown> = { _this: vmId };
    if (hostId) args.host = hostId;
    const response = await this.callFn('PowerOnVM_Task', args);
    return this.taskEngine.handleTaskResponse(response);
  }

  /**
   * Powers off a virtual machine (hard stop).
   * @param vmId - VM to power off.
   */
  async powerOff(vmId: MoRef): Promise<TaskHandle> {
    this.logger.info(`Powering off VM ${vmId.value}`);
    const response = await this.callFn('PowerOffVM_Task', { _this: vmId });
    return this.taskEngine.handleTaskResponse(response);
  }

  /**
   * Hard-resets a virtual machine.
   * @param vmId - VM to reset.
   */
  async reset(vmId: MoRef): Promise<TaskHandle> {
    this.logger.info(`Resetting VM ${vmId.value}`);
    const response = await this.callFn('ResetVM_Task', { _this: vmId });
    return this.taskEngine.handleTaskResponse(response);
  }

  /**
   * Suspends a virtual machine.
   * @param vmId - VM to suspend.
   */
  async suspend(vmId: MoRef): Promise<TaskHandle> {
    this.logger.info(`Suspending VM ${vmId.value}`);
    const response = await this.callFn('SuspendVM_Task', { _this: vmId });
    return this.taskEngine.handleTaskResponse(response);
  }

  /**
   * Reconfigures a VM's CPU, memory, or annotations.
   * @param vmId - VM to reconfigure.
   * @param spec - Desired configuration changes.
   */
  async reconfigure(vmId: MoRef, spec: VmReconfigSpec): Promise<TaskHandle> {
    this.logger.info(`Reconfiguring VM ${vmId.value}`);

    const configSpec: Record<string, unknown> = {};
    if (spec.cpu !== undefined) configSpec.numCPUs = spec.cpu;
    if (spec.memoryMB !== undefined) configSpec.memoryMB = spec.memoryMB;
    if (spec.notes !== undefined) configSpec.annotation = spec.notes;

    const response = await this.callFn('ReconfigVM_Task', {
      _this: vmId,
      spec: configSpec,
    });
    return this.taskEngine.handleTaskResponse(response);
  }

  /**
   * Clones a virtual machine.
   * @param vmId - Source VM to clone.
   * @param options - Clone destination and settings.
   */
  async clone(vmId: MoRef, options: VmCloneOptions): Promise<TaskHandle> {
    this.logger.info(`Cloning VM ${vmId.value} as ${options.name}`);

    const location: Record<string, unknown> = {};
    if (options.datastore) location.datastore = options.datastore;
    if (options.resourcePool) location.pool = options.resourcePool;

    const response = await this.callFn('CloneVM_Task', {
      _this: vmId,
      folder: options.folder,
      name: options.name,
      spec: {
        location,
        powerOn: options.powerOn ?? false,
        template: options.asTemplate ?? false,
      },
    });
    return this.taskEngine.handleTaskResponse(response);
  }

  /**
   * Destroys a virtual machine and its associated files.
   * @param vmId - VM to destroy.
   */
  async destroy(vmId: MoRef): Promise<TaskHandle> {
    this.logger.info(`Destroying VM ${vmId.value}`);
    const response = await this.callFn('Destroy_Task', { _this: vmId });
    return this.taskEngine.handleTaskResponse(response);
  }

  /**
   * Unregisters a VM from inventory without deleting its files.
   * @param vmId - VM to unregister.
   */
  async unregister(vmId: MoRef): Promise<void> {
    this.logger.info(`Unregistering VM ${vmId.value}`);
    await this.callFn('UnregisterVM', { _this: vmId });
  }
}
