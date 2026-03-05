import type { MoRef } from '../types/mo-ref.js';
import type { Logger } from '../types/config.js';
import type {
  DatacenterSummary,
  ClusterSummary,
  HostSummary,
  VmSummary,
  DatastoreSummary,
  NetworkSummary,
} from '../types/models.js';
import { VsphereError, VsphereErrorCode } from '../types/errors.js';
import { PropertyCollectorHelper } from './property-collector.js';
import { mapDatacenterProperties, DATACENTER_PROPERTY_PATHS } from '../mappers/datacenter-mapper.js';
import { mapClusterProperties, CLUSTER_PROPERTY_PATHS } from '../mappers/cluster-mapper.js';
import { mapHostProperties, HOST_PROPERTY_PATHS } from '../mappers/host-mapper.js';
import { mapVmProperties, VM_PROPERTY_PATHS } from '../mappers/vm-mapper.js';
import { mapDatastoreProperties, DATASTORE_PROPERTY_PATHS } from '../mappers/datastore-mapper.js';
import { mapNetworkProperties, NETWORK_PROPERTY_PATHS } from '../mappers/network-mapper.js';

/** Filter criteria for listing virtual machines. */
export interface VmFilter {
  /** Restrict results to VMs inside this folder. */
  folderId?: MoRef;
  /** Restrict results to VMs in this cluster. */
  clusterId?: MoRef;
  /** Restrict results to VMs on this host. */
  hostId?: MoRef;
  /** Case-insensitive substring match on VM name. */
  nameContains?: string;
}

/** Provides read-only inventory queries against vCenter. */
export class InventoryModule {
  constructor(
    private readonly pc: PropertyCollectorHelper,
    private readonly logger: Logger,
  ) {}

  /** Lists all datacenters in the inventory. */
  async listDatacenters(): Promise<DatacenterSummary[]> {
    this.logger.debug('Listing datacenters');
    const results = await this.pc.retrieveProperties('Datacenter', DATACENTER_PROPERTY_PATHS);
    return results.map((r) => mapDatacenterProperties(r.obj, r.propSet));
  }

  /**
   * Lists clusters, optionally filtered by datacenter.
   * @param datacenterId - Restrict to clusters in this datacenter.
   */
  async listClusters(datacenterId?: MoRef): Promise<ClusterSummary[]> {
    this.logger.debug('Listing clusters');
    const results = await this.pc.retrieveProperties(
      'ClusterComputeResource',
      CLUSTER_PROPERTY_PATHS,
      datacenterId,
    );
    return results.map((r) => mapClusterProperties(r.obj, r.propSet));
  }

  /**
   * Lists ESXi hosts, optionally filtered by cluster.
   * @param clusterId - Restrict to hosts in this cluster.
   */
  async listHosts(clusterId?: MoRef): Promise<HostSummary[]> {
    this.logger.debug('Listing hosts');
    const results = await this.pc.retrieveProperties(
      'HostSystem',
      HOST_PROPERTY_PATHS,
      clusterId,
    );
    return results.map((r) => mapHostProperties(r.obj, r.propSet));
  }

  /**
   * Lists virtual machines with optional filtering.
   * @param filter - Criteria to narrow results.
   */
  async listVMs(filter?: VmFilter): Promise<VmSummary[]> {
    this.logger.debug('Listing VMs');
    const container = filter?.clusterId ?? filter?.hostId ?? filter?.folderId;
    const results = await this.pc.retrieveProperties(
      'VirtualMachine',
      VM_PROPERTY_PATHS,
      container,
    );

    let vms = results.map((r) => mapVmProperties(r.obj, r.propSet));

    if (filter?.nameContains) {
      const search = filter.nameContains.toLowerCase();
      vms = vms.filter((vm) => vm.name.toLowerCase().includes(search));
    }

    return vms;
  }

  /**
   * Retrieves a single VM by its managed object reference. Throws {@link VsphereErrorCode.NOT_FOUND} if missing.
   * @param vmId - VM managed object reference.
   */
  async getVM(vmId: MoRef): Promise<VmSummary> {
    this.logger.debug(`Getting VM ${vmId.value}`);
    const props = await this.pc.retrieveOne(vmId, VM_PROPERTY_PATHS);
    if (!props) {
      throw new VsphereError(`VM ${vmId.value} not found`, VsphereErrorCode.NOT_FOUND, { moRef: vmId });
    }

    const propSet = Object.entries(props).map(([name, val]) => ({ name, val }));
    return mapVmProperties(vmId, propSet);
  }

  /**
   * Lists datastores, optionally filtered by datacenter.
   * @param datacenterId - Restrict to datastores in this datacenter.
   */
  async listDatastores(datacenterId?: MoRef): Promise<DatastoreSummary[]> {
    this.logger.debug('Listing datastores');
    const results = await this.pc.retrieveProperties(
      'Datastore',
      DATASTORE_PROPERTY_PATHS,
      datacenterId,
    );
    return results.map((r) => mapDatastoreProperties(r.obj, r.propSet));
  }

  /**
   * Lists networks, optionally filtered by datacenter.
   * @param datacenterId - Restrict to networks in this datacenter.
   */
  async listNetworks(datacenterId?: MoRef): Promise<NetworkSummary[]> {
    this.logger.debug('Listing networks');
    const results = await this.pc.retrieveProperties(
      'Network',
      NETWORK_PROPERTY_PATHS,
      datacenterId,
    );
    return results.map((r) => mapNetworkProperties(r.obj, r.propSet));
  }
}
