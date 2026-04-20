import type { MoRef } from '../types/mo-ref.js';
import type { Logger } from '../types/config.js';
import type { Snapshot } from '../types/models.js';
import type { TaskEngine, CallFn } from '../tasks/task-engine.js';
import type { TaskHandle } from '../tasks/task-handle.js';
import type { PropertyCollectorHelper } from '../inventory/property-collector.js';
import { mapSnapshotTree } from '../mappers/snapshot-mapper.js';

/** Options for creating a VM snapshot. */
export interface CreateSnapshotOptions {
  /** Snapshot display name. */
  name: string;
  /** Optional description. Default: `""`. */
  description?: string;
  /** Include VM memory in the snapshot. Default: `false`. */
  memory?: boolean;
  /** Quiesce the guest filesystem via VMware Tools. Default: `false`. */
  quiesce?: boolean;
}

/** Snapshot lifecycle operations for virtual machines. */
export class SnapshotModule {
  constructor(
    private readonly callFn: CallFn,
    private readonly taskEngine: TaskEngine,
    private readonly pc: PropertyCollectorHelper,
    private readonly logger: Logger,
  ) {}

  /**
   * Creates a new snapshot for a VM.
   * @param vmId - Target VM.
   * @param options - Snapshot name and settings.
   */
  async create(vmId: MoRef, options: CreateSnapshotOptions): Promise<TaskHandle> {
    this.logger.info(`Creating snapshot "${options.name}" for VM ${vmId.value}`);
    const response = await this.callFn('CreateSnapshot_Task', {
      _this: vmId,
      name: options.name,
      description: options.description ?? '',
      memory: options.memory ?? false,
      quiesce: options.quiesce ?? false,
    });
    return this.taskEngine.handleTaskResponse(response);
  }

  /**
   * Lists the snapshot tree for a VM.
   * @param vmId - VM whose snapshots to list.
   */
  async list(vmId: MoRef): Promise<Snapshot[]> {
    this.logger.debug(`Listing snapshots for VM ${vmId.value}`);
    const props = await this.pc.retrieveOne(vmId, ['snapshot.rootSnapshotList']);
    if (!props) return [];
    return mapSnapshotTree(props['snapshot.rootSnapshotList']);
  }

  /**
   * Removes a single snapshot.
   * @param snapshotId - Snapshot to remove.
   * @param options - Set `removeChildren` to also remove child snapshots.
   */
  async remove(snapshotId: MoRef, options?: { removeChildren?: boolean }): Promise<TaskHandle> {
    this.logger.info(`Removing snapshot ${snapshotId.value}`);
    const response = await this.callFn('RemoveSnapshot_Task', {
      _this: snapshotId,
      removeChildren: options?.removeChildren ?? false,
      consolidate: true,
    });
    return this.taskEngine.handleTaskResponse(response);
  }

  /**
   * Removes all snapshots from a VM.
   * @param vmId - VM whose snapshots to remove.
   */
  async removeAll(vmId: MoRef): Promise<TaskHandle> {
    this.logger.info(`Removing all snapshots from VM ${vmId.value}`);
    const response = await this.callFn('RemoveAllSnapshots_Task', {
      _this: vmId,
      consolidate: true,
    });
    return this.taskEngine.handleTaskResponse(response);
  }

  /**
   * Reverts the VM to the specified snapshot.
   * @param snapshotId - Snapshot to revert to.
   */
  async revert(snapshotId: MoRef): Promise<TaskHandle> {
    this.logger.info(`Reverting to snapshot ${snapshotId.value}`);
    const response = await this.callFn('RevertToSnapshot_Task', {
      _this: snapshotId,
    });
    return this.taskEngine.handleTaskResponse(response);
  }

  /**
   * Consolidates VM disks after snapshot operations.
   * @param vmId - VM whose disks to consolidate.
   */
  async consolidate(vmId: MoRef): Promise<TaskHandle> {
    this.logger.info(`Consolidating disks for VM ${vmId.value}`);
    const response = await this.callFn('ConsolidateVMDisks_Task', {
      _this: vmId,
    });
    return this.taskEngine.handleTaskResponse(response);
  }
}
