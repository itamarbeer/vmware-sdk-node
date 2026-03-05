import { VsphereError, VsphereErrorCode } from '../types/errors.js';
import type { MoRef } from '../types/mo-ref.js';

interface SoapFaultContext {
  method?: string;
  moRef?: MoRef;
}

function extractFaultType(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') return undefined;

  const root = (err as Record<string, unknown>).root;
  if (root && typeof root === 'object') {
    const envelope = (root as Record<string, unknown>).Envelope;
    if (envelope && typeof envelope === 'object') {
      const body = (envelope as Record<string, unknown>).Body;
      if (body && typeof body === 'object') {
        const fault = (body as Record<string, unknown>).Fault;
        if (fault && typeof fault === 'object') {
          const detail = (fault as Record<string, unknown>).detail;
          if (detail && typeof detail === 'object') {
            const keys = Object.keys(detail);
            if (keys.length > 0) return keys[0];
          }
          const faultstring = (fault as Record<string, unknown>).faultstring;
          if (typeof faultstring === 'string') return faultstring;
        }
      }
    }
  }

  if ('message' in (err as Record<string, unknown>)) {
    return (err as Record<string, string>).message;
  }

  return undefined;
}

const FAULT_MAP: Record<string, VsphereErrorCode> = {
  InvalidLogin: VsphereErrorCode.AUTH_FAILED,
  InvalidLoginFault: VsphereErrorCode.AUTH_FAILED,
  NotAuthenticated: VsphereErrorCode.SESSION_EXPIRED,
  NotAuthenticatedFault: VsphereErrorCode.SESSION_EXPIRED,
  NoPermission: VsphereErrorCode.AUTH_FAILED,
  ManagedObjectNotFound: VsphereErrorCode.NOT_FOUND,
  ManagedObjectNotFoundFault: VsphereErrorCode.NOT_FOUND,
  InvalidArgument: VsphereErrorCode.INVALID_ARGUMENT,
  InvalidArgumentFault: VsphereErrorCode.INVALID_ARGUMENT,
};

export function wrapSoapFault(err: unknown, context?: SoapFaultContext): VsphereError {
  if (err instanceof VsphereError) return err;

  const faultType = extractFaultType(err);
  const code = (faultType && FAULT_MAP[faultType]) || VsphereErrorCode.SOAP_FAULT;

  const message = faultType
    ? `SOAP fault: ${faultType}${context?.method ? ` (method: ${context.method})` : ''}`
    : `SOAP error${context?.method ? ` (method: ${context.method})` : ''}: ${err}`;

  return new VsphereError(message, code, {
    soapFault: err,
    moRef: context?.moRef,
    cause: err instanceof Error ? err : undefined,
  });
}
