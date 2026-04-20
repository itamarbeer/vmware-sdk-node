import type { MoRef } from './mo-ref.js';

/** Error codes used by {@link VsphereError} to classify failures. */
export enum VsphereErrorCode {
  /** TCP/TLS connection to vCenter failed. */
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  /** Username or password rejected by vCenter. */
  AUTH_FAILED = 'AUTH_FAILED',
  /** The SOAP session has expired or been invalidated. */
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  /** vCenter returned a SOAP fault. */
  SOAP_FAULT = 'SOAP_FAULT',
  /** A vSphere task completed with an error. */
  TASK_FAILED = 'TASK_FAILED',
  /** A vSphere task did not complete within the allowed timeout. */
  TASK_TIMEOUT = 'TASK_TIMEOUT',
  /** The requested managed object was not found. */
  NOT_FOUND = 'NOT_FOUND',
  /** Request was rejected due to rate limiting. */
  RATE_LIMITED = 'RATE_LIMITED',
  /** An invalid argument was supplied. */
  INVALID_ARGUMENT = 'INVALID_ARGUMENT',
  /** An unclassified error occurred. */
  UNKNOWN = 'UNKNOWN',
}

/** Optional context attached to a {@link VsphereError}. */
export interface VsphereErrorOptions {
  /** Raw SOAP fault object, if available. */
  soapFault?: unknown;
  /** Managed object reference related to the error. */
  moRef?: MoRef;
  /** Underlying cause error. */
  cause?: Error;
  /** HTTP status code, if applicable. */
  statusCode?: number;
}

/** Typed error thrown by all vsphere-client operations. */
export class VsphereError extends Error {
  /** Machine-readable error classification. */
  readonly code: VsphereErrorCode;
  /** Raw SOAP fault, when the error originates from a SOAP call. */
  readonly soapFault?: unknown;
  /** Related managed object reference, if applicable. */
  readonly moRef?: MoRef;
  /** HTTP status code returned by vCenter, if applicable. */
  readonly statusCode?: number;

  /**
   * @param message - Human-readable error description.
   * @param code - Error classification code.
   * @param options - Additional error context.
   */
  constructor(message: string, code: VsphereErrorCode, options?: VsphereErrorOptions) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = 'VsphereError';
    this.code = code;
    this.soapFault = options?.soapFault;
    this.moRef = options?.moRef;
    this.statusCode = options?.statusCode;
  }
}
