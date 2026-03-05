import type { MoRef } from '../types/mo-ref.js';
import type { Logger } from '../types/config.js';
import type { NormalizedError } from '../types/models.js';
import type { CallFn } from '../tasks/task-engine.js';
import type { EventsModule } from '../events/events-module.js';
import { VsphereErrorCode } from '../types/errors.js';

/** Filter for querying recent errors. */
export interface RecentErrorsFilter {
  /** Return errors that occurred after this date. */
  since: Date;
}

/** Aggregates error events from vCenter and local error tracking. */
export class HealthModule {
  private errorBuffer: NormalizedError[] = [];
  private readonly maxErrors = 500;

  constructor(
    private readonly callFn: CallFn,
    private readonly eventsModule: EventsModule,
    private readonly logger: Logger,
  ) {}

  /**
   * Records a local error into the in-memory buffer.
   * @param code - Error classification code.
   * @param message - Human-readable error message.
   * @param options - Optional managed object reference and raw data.
   */
  recordError(
    code: VsphereErrorCode,
    message: string,
    options?: { moRef?: MoRef; raw?: unknown },
  ): void {
    const error: NormalizedError = {
      timestamp: new Date(),
      severity: 'error',
      sourceType: options?.moRef?.type ?? 'unknown',
      sourceId: options?.moRef?.value ?? 'unknown',
      message,
      raw: options?.raw,
    };

    this.errorBuffer.push(error);
    if (this.errorBuffer.length > this.maxErrors) {
      this.errorBuffer = this.errorBuffer.slice(-this.maxErrors);
    }
  }

  /**
   * Returns recent errors from both vCenter events and the local buffer.
   * @param filter - Time-based filter.
   */
  async recentErrors(filter: RecentErrorsFilter): Promise<NormalizedError[]> {
    this.logger.debug('Fetching recent errors');

    const errorTypes = [
      'VmFailedToPowerOnEvent',
      'VmFailedToPowerOffEvent',
      'VmDisconnectedEvent',
      'HostConnectionLostEvent',
      'HostDisconnectedEvent',
      'TaskEvent',
      'EventEx',
      'AlarmStatusChangedEvent',
    ];

    const events = await this.eventsModule.query({
      since: filter.since,
      types: errorTypes,
      maxCount: 500,
    });

    const normalized: NormalizedError[] = events.map((event) => ({
      timestamp: event.createdTime,
      severity: inferSeverity(event.eventType),
      sourceType: event.entityRef?.type ?? 'unknown',
      sourceId: event.entityRef?.value ?? event.entityName ?? 'unknown',
      message: event.message,
      raw: event,
    }));

    // Merge with locally recorded errors
    const localErrors = this.errorBuffer.filter(
      (e) => e.timestamp >= filter.since,
    );

    return [...normalized, ...localErrors].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
  }

  /**
   * Returns locally recorded errors, optionally filtered to a recent time window.
   * @param sinceMs - Only return errors from the last N milliseconds.
   */
  getLocalErrors(sinceMs?: number): NormalizedError[] {
    if (sinceMs === undefined) return [...this.errorBuffer];
    const since = Date.now() - sinceMs;
    return this.errorBuffer.filter((e) => e.timestamp.getTime() >= since);
  }

  /** Returns a count of buffered errors grouped by source type. */
  getErrorSummary(): Record<string, number> {
    const summary: Record<string, number> = {};
    for (const err of this.errorBuffer) {
      summary[err.sourceType] = (summary[err.sourceType] ?? 0) + 1;
    }
    return summary;
  }

  /** Clears all locally buffered errors. */
  clear(): void {
    this.errorBuffer = [];
  }
}

function inferSeverity(eventType: string): 'error' | 'warning' | 'info' {
  if (eventType.includes('Failed') || eventType.includes('Lost') || eventType.includes('Disconnected')) {
    return 'error';
  }
  if (eventType.includes('Alarm') || eventType.includes('Warning')) {
    return 'warning';
  }
  return 'info';
}
