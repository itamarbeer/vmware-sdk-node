import type { MoRef } from '../types/mo-ref.js';
import type { Logger } from '../types/config.js';
import type { VsphereAlarm } from '../types/models.js';
import type { CallFn } from '../tasks/task-engine.js';
import type { PropertyCollectorHelper } from '../inventory/property-collector.js';
import { mapAlarms } from '../mappers/alarm-mapper.js';

/** Filter criteria for listing active alarms. */
export interface AlarmFilter {
  /** Restrict to alarms on this entity; defaults to the root folder. */
  entityId?: MoRef;
}

/** Lists and acknowledges triggered vSphere alarms. */
export class AlarmsModule {
  constructor(
    private readonly callFn: CallFn,
    private readonly alarmManagerRef: MoRef,
    private readonly pc: PropertyCollectorHelper,
    private readonly rootFolderRef: MoRef,
    private readonly logger: Logger,
  ) {}

  /**
   * Lists currently triggered alarms.
   * @param options - Optional filter to scope by entity.
   */
  async listActive(options?: AlarmFilter): Promise<VsphereAlarm[]> {
    this.logger.debug('Listing active alarms');

    const entityRef = options?.entityId ?? this.rootFolderRef;
    const props = await this.pc.retrieveOne(entityRef, ['triggeredAlarmState']);

    if (!props || !props['triggeredAlarmState']) return [];

    return mapAlarms(props['triggeredAlarmState']);
  }

  /**
   * Acknowledges a triggered alarm on an entity.
   * @param alarmRef - The alarm to acknowledge.
   * @param entityRef - The entity the alarm is triggered on.
   */
  async acknowledge(alarmRef: MoRef, entityRef: MoRef): Promise<void> {
    this.logger.info(`Acknowledging alarm ${alarmRef.value} on ${entityRef.value}`);
    await this.callFn('AcknowledgeAlarm', {
      _this: this.alarmManagerRef,
      alarm: alarmRef,
      entity: entityRef,
    });
  }
}
