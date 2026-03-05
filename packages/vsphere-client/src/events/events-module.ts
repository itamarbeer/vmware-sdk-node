import type { MoRef } from '../types/mo-ref.js';
import type { Logger } from '../types/config.js';
import type { VsphereEvent } from '../types/models.js';
import type { CallFn } from '../tasks/task-engine.js';
import { mapEvents } from '../mappers/event-mapper.js';
import { toMoRef, ensureArray } from '../mappers/common.js';

/** Filter criteria for querying vSphere events. */
export interface EventFilter {
  /** Return events created after this date. */
  since?: Date;
  /** Restrict to specific event type class names. */
  types?: string[];
  /** Restrict to events related to this entity. */
  entityId?: MoRef;
  /** Maximum number of events to return. Default: `100`. */
  maxCount?: number;
}

/** Queries the vCenter EventManager for historical events. */
export class EventsModule {
  constructor(
    private readonly callFn: CallFn,
    private readonly eventManagerRef: MoRef,
    private readonly logger: Logger,
  ) {}

  /**
   * Queries events from vCenter using an EventHistoryCollector.
   * @param filter - Optional criteria to narrow results.
   */
  async query(filter?: EventFilter): Promise<VsphereEvent[]> {
    this.logger.debug('Querying events');

    const filterSpec: Record<string, unknown> = {};

    if (filter?.since) {
      filterSpec.time = {
        beginTime: filter.since.toISOString(),
      };
    }

    if (filter?.entityId) {
      filterSpec.entity = {
        entity: filter.entityId,
        recursion: 'all',
      };
    }

    if (filter?.types && filter.types.length > 0) {
      filterSpec.eventTypeId = filter.types;
    }

    // Create an EventHistoryCollector
    const collectorResponse = await this.callFn<Record<string, unknown>>(
      'CreateCollectorForEvents',
      {
        _this: this.eventManagerRef,
        filter: filterSpec,
      },
    );

    const collectorRef = toMoRef(
      (collectorResponse as Record<string, unknown>).returnval ?? collectorResponse,
    );

    try {
      // Reset collector to beginning
      await this.callFn('ResetCollector', { _this: collectorRef });

      // Read events
      const maxCount = filter?.maxCount ?? 100;
      const readResponse = await this.callFn<Record<string, unknown>>('ReadNextEvents', {
        _this: collectorRef,
        maxCount,
      });

      const rawEvents = ensureArray(
        (readResponse as Record<string, unknown>)?.returnval ?? readResponse,
      );
      return mapEvents(rawEvents);
    } finally {
      // Clean up the collector to avoid server-side resource leaks
      await this.callFn('DestroyCollector', { _this: collectorRef }).catch(() => {});
    }
  }
}
