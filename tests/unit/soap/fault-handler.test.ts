import { describe, it, expect } from 'vitest';
import { wrapSoapFault } from '../../../src/soap/fault-handler.js';
import { VsphereError, VsphereErrorCode } from '../../../src/types/errors.js';

describe('wrapSoapFault', () => {
  it('should pass through VsphereError unchanged', () => {
    const err = new VsphereError('test', VsphereErrorCode.AUTH_FAILED);
    expect(wrapSoapFault(err)).toBe(err);
  });

  it('should map InvalidLogin fault', () => {
    const rawFault = {
      root: {
        Envelope: {
          Body: {
            Fault: {
              detail: { InvalidLoginFault: {} },
              faultstring: 'Cannot complete login',
            },
          },
        },
      },
    };

    const err = wrapSoapFault(rawFault, { method: 'Login' });
    expect(err).toBeInstanceOf(VsphereError);
    expect(err.code).toBe(VsphereErrorCode.AUTH_FAILED);
    expect(err.message).toContain('InvalidLoginFault');
    expect(err.message).toContain('Login');
  });

  it('should map NotAuthenticated fault', () => {
    const rawFault = {
      root: {
        Envelope: {
          Body: {
            Fault: {
              detail: { NotAuthenticated: {} },
            },
          },
        },
      },
    };

    const err = wrapSoapFault(rawFault);
    expect(err.code).toBe(VsphereErrorCode.SESSION_EXPIRED);
  });

  it('should map ManagedObjectNotFound fault', () => {
    const rawFault = {
      root: {
        Envelope: {
          Body: {
            Fault: {
              detail: { ManagedObjectNotFound: {} },
            },
          },
        },
      },
    };

    const err = wrapSoapFault(rawFault);
    expect(err.code).toBe(VsphereErrorCode.NOT_FOUND);
  });

  it('should default to SOAP_FAULT for unknown faults', () => {
    const rawFault = {
      root: {
        Envelope: {
          Body: {
            Fault: {
              detail: { SomeOtherFault: {} },
            },
          },
        },
      },
    };

    const err = wrapSoapFault(rawFault);
    expect(err.code).toBe(VsphereErrorCode.SOAP_FAULT);
  });

  it('should handle plain Error objects', () => {
    const err = wrapSoapFault(new Error('network error'), { method: 'RetrieveProperties' });
    expect(err.code).toBe(VsphereErrorCode.SOAP_FAULT);
    expect(err.message).toContain('network error');
  });
});
