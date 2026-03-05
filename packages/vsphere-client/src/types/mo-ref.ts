/** vSphere Managed Object Reference — uniquely identifies a server-side object. */
export interface MoRef {
  /** Managed object type (e.g. "VirtualMachine", "HostSystem"). */
  type: string;
  /** Unique identifier value on the vCenter server. */
  value: string;
}

/**
 * Creates a {@link MoRef} from a type and value pair.
 * @param type - Managed object type.
 * @param value - Managed object identifier.
 */
export function moRef(type: string, value: string): MoRef {
  return { type, value };
}

/** Singleton MoRef for the vSphere ServiceInstance. */
export const SERVICE_INSTANCE: MoRef = { type: 'ServiceInstance', value: 'ServiceInstance' };
