import { describe, it, expect, vi } from 'vitest';
import { HealthModule } from '../../../src/health/health-module.js';
import { VsphereErrorCode } from '../../../src/types/errors.js';
import { noopLogger } from '../../../src/utils/logger.js';

function createHealthModule() {
  const mockEvents = {
    query: vi.fn().mockResolvedValue([]),
  };
  const callFn = vi.fn();
  return new HealthModule(callFn, mockEvents as never, noopLogger);
}

describe('HealthModule', () => {
  it('should record errors', () => {
    const health = createHealthModule();
    health.recordError(VsphereErrorCode.SOAP_FAULT, 'Test error', {
      moRef: { type: 'VirtualMachine', value: 'vm-1' },
    });

    const errors = health.getLocalErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Test error');
    expect(errors[0].sourceType).toBe('VirtualMachine');
    expect(errors[0].sourceId).toBe('vm-1');
  });

  it('should limit max errors', () => {
    const health = createHealthModule();
    for (let i = 0; i < 600; i++) {
      health.recordError(VsphereErrorCode.SOAP_FAULT, `Error ${i}`);
    }

    const errors = health.getLocalErrors();
    expect(errors.length).toBeLessThanOrEqual(500);
  });

  it('should filter errors by time', async () => {
    const health = createHealthModule();
    health.recordError(VsphereErrorCode.SOAP_FAULT, 'Recent error');

    const recent = health.getLocalErrors(60_000);
    expect(recent).toHaveLength(1);

    // Errors from the last 0ms ago should exclude errors recorded before
    await new Promise((r) => setTimeout(r, 5));
    const old = health.getLocalErrors(0);
    expect(old).toHaveLength(0);
  });

  it('should produce error summary', () => {
    const health = createHealthModule();
    health.recordError(VsphereErrorCode.SOAP_FAULT, 'Error 1', {
      moRef: { type: 'VirtualMachine', value: 'vm-1' },
    });
    health.recordError(VsphereErrorCode.SOAP_FAULT, 'Error 2', {
      moRef: { type: 'VirtualMachine', value: 'vm-2' },
    });
    health.recordError(VsphereErrorCode.SOAP_FAULT, 'Error 3', {
      moRef: { type: 'HostSystem', value: 'host-1' },
    });

    const summary = health.getErrorSummary();
    expect(summary['VirtualMachine']).toBe(2);
    expect(summary['HostSystem']).toBe(1);
  });

  it('should clear errors', () => {
    const health = createHealthModule();
    health.recordError(VsphereErrorCode.SOAP_FAULT, 'Error');
    health.clear();
    expect(health.getLocalErrors()).toHaveLength(0);
  });
});
