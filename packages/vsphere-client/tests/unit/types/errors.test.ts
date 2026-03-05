import { describe, it, expect } from 'vitest';
import { VsphereError, VsphereErrorCode } from '../../../src/types/errors.js';

describe('VsphereError', () => {
  it('should store error code', () => {
    const err = new VsphereError('test', VsphereErrorCode.AUTH_FAILED);
    expect(err.code).toBe(VsphereErrorCode.AUTH_FAILED);
    expect(err.message).toBe('test');
    expect(err.name).toBe('VsphereError');
  });

  it('should store soapFault and moRef', () => {
    const fault = { detail: 'some fault' };
    const moRef = { type: 'VirtualMachine', value: 'vm-1' };
    const err = new VsphereError('test', VsphereErrorCode.SOAP_FAULT, {
      soapFault: fault,
      moRef,
    });

    expect(err.soapFault).toBe(fault);
    expect(err.moRef).toEqual(moRef);
  });

  it('should chain cause', () => {
    const cause = new Error('original');
    const err = new VsphereError('wrapped', VsphereErrorCode.UNKNOWN, { cause });
    expect(err.cause).toBe(cause);
  });

  it('should be instanceof Error', () => {
    const err = new VsphereError('test', VsphereErrorCode.UNKNOWN);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(VsphereError);
  });
});
