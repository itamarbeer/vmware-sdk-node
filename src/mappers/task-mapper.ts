import type { VsphereTask, TaskState } from '../types/models.js';
import type { MoRef } from '../types/mo-ref.js';
import { toMoRef, toString, toDate, toNumber, propsToMap } from './common.js';

export function mapTaskProperties(
  obj: MoRef,
  propSet: Array<{ name: string; val: unknown }>,
): VsphereTask {
  const props = propsToMap(propSet);
  const info = (props['info'] ?? props) as Record<string, unknown>;

  return mapTaskInfo(obj, info);
}

export function mapTaskInfo(taskRef: MoRef, info: Record<string, unknown>): VsphereTask {
  return {
    moRef: taskRef,
    name: toString(info.name || info.descriptionId),
    entityRef: info.entity ? toMoRef(info.entity) : undefined,
    state: mapTaskState(info.state),
    progress: info.progress !== undefined ? toNumber(info.progress) : undefined,
    startTime: toDate(info.startTime),
    completeTime: toDate(info.completeTime),
    errorMessage: info.error ? extractErrorMessage(info.error) : undefined,
  };
}

function mapTaskState(raw: unknown): TaskState {
  const s = toString(raw);
  if (s === 'queued') return 'queued';
  if (s === 'running') return 'running';
  if (s === 'success') return 'success';
  if (s === 'error') return 'error';
  return 'queued';
}

function extractErrorMessage(raw: unknown): string {
  if (!raw || typeof raw !== 'object') return String(raw);
  const obj = raw as Record<string, unknown>;
  if (obj.localizedMessage) return String(obj.localizedMessage);
  if (obj.fault && typeof obj.fault === 'object') {
    const fault = obj.fault as Record<string, unknown>;
    return String(fault.faultMessage || fault.msg || JSON.stringify(fault));
  }
  return String(obj.msg || JSON.stringify(raw));
}

export const TASK_PROPERTY_PATHS = ['info'];
