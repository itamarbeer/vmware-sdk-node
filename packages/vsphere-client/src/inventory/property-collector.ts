import type { MoRef } from '../types/mo-ref.js';
import type { Logger } from '../types/config.js';
import type { CallFn } from '../tasks/task-engine.js';
import { toMoRef, ensureArray } from '../mappers/common.js';
import type { ObjectContent } from '../mappers/common.js';

export class PropertyCollectorHelper {
  private viewManagerRef: MoRef = { type: 'ViewManager', value: 'ViewManager' };

  constructor(
    private readonly callFn: CallFn,
    private readonly propertyCollectorRef: MoRef,
    private readonly rootFolderRef: MoRef,
    private readonly logger: Logger,
  ) {}

  setViewManager(ref: MoRef): void {
    this.viewManagerRef = ref;
  }

  async retrieveProperties(
    type: string,
    pathSet: string[],
    container?: MoRef,
  ): Promise<ObjectContent[]> {
    const startFrom = container ?? this.rootFolderRef;

    const traversalSpecs = this.buildTraversalSpecs();

    const specSet = [
      {
        propSet: [{ type, pathSet }],
        objectSet: [
          {
            obj: startFrom,
            skip: true,
            selectSet: traversalSpecs,
          },
        ],
      },
    ];

    return this.executeRetrieve(specSet);
  }

  async retrieveOne(moRef: MoRef, pathSet: string[]): Promise<Record<string, unknown> | null> {
    const specSet = [
      {
        propSet: [{ type: moRef.type, pathSet }],
        objectSet: [{ obj: moRef, skip: false }],
      },
    ];

    const results = await this.executeRetrieve(specSet);
    if (results.length === 0) return null;

    const map: Record<string, unknown> = {};
    for (const prop of results[0].propSet ?? []) {
      map[prop.name] = prop.val;
    }
    return map;
  }

  async retrieveContainerContents(
    container: MoRef,
    type: string,
    pathSet: string[],
  ): Promise<ObjectContent[]> {
    // Create a ContainerView for scoped queries
    const viewResult = await this.callFn<Record<string, unknown>>('CreateContainerView', {
      _this: this.viewManagerRef,
      container,
      type: [type],
      recursive: true,
    });

    const viewRef = toMoRef((viewResult as Record<string, unknown>).returnval ?? viewResult);

    try {
      const specSet = [
        {
          propSet: [{ type, pathSet }],
          objectSet: [
            {
              obj: viewRef,
              skip: true,
              selectSet: [
                {
                  attributes: { 'xsi:type': 'TraversalSpec' },
                  name: 'viewTraversal',
                  type: 'ContainerView',
                  path: 'view',
                  skip: false,
                },
              ],
            },
          ],
        },
      ];

      return await this.executeRetrieve(specSet);
    } finally {
      await this.callFn('DestroyView', { _this: viewRef }).catch((err) => {
        this.logger.warn(`Failed to destroy container view: ${err}`);
      });
    }
  }

  private async executeRetrieve(
    specSet: unknown[],
  ): Promise<ObjectContent[]> {
    const results: ObjectContent[] = [];

    const response = await this.callFn<Record<string, unknown>>('RetrievePropertiesEx', {
      _this: this.propertyCollectorRef,
      specSet,
      options: {},
    });

    const returnval = (response as Record<string, unknown>)?.returnval as Record<string, unknown> | undefined;
    if (!returnval) return results;

    this.extractObjects(returnval, results);

    // Handle continuation token
    let token = returnval.token as string | undefined;
    while (token) {
      const contResponse = await this.callFn<Record<string, unknown>>('ContinueRetrievePropertiesEx', {
        _this: this.propertyCollectorRef,
        token,
      });

      const contReturnval = (contResponse as Record<string, unknown>)?.returnval as Record<string, unknown> | undefined;
      if (!contReturnval) break;

      this.extractObjects(contReturnval, results);
      token = contReturnval.token as string | undefined;
    }

    return results;
  }

  private extractObjects(
    returnval: Record<string, unknown>,
    results: ObjectContent[],
  ): void {
    const objects = ensureArray(returnval.objects);
    for (const objRaw of objects) {
      const obj = objRaw as Record<string, unknown>;
      const moRef = toMoRef(obj.obj);
      const propSet = ensureArray(obj.propSet) as Array<{ name: string; val: unknown }>;
      results.push({ obj: moRef, propSet });
    }
  }

  private buildTraversalSpecs(): unknown[] {
    return [
      {
        attributes: { 'xsi:type': 'TraversalSpec' },
        name: 'folderTraversal',
        type: 'Folder',
        path: 'childEntity',
        skip: false,
        selectSet: [
          { name: 'folderTraversal' },
          { name: 'datacenterHostTraversal' },
          { name: 'datacenterVmTraversal' },
          { name: 'datacenterDsTraversal' },
          { name: 'computeResourceTraversal' },
          { name: 'hostTraversal' },
        ],
      },
      {
        attributes: { 'xsi:type': 'TraversalSpec' },
        name: 'datacenterHostTraversal',
        type: 'Datacenter',
        path: 'hostFolder',
        skip: false,
        selectSet: [{ name: 'folderTraversal' }],
      },
      {
        attributes: { 'xsi:type': 'TraversalSpec' },
        name: 'datacenterVmTraversal',
        type: 'Datacenter',
        path: 'vmFolder',
        skip: false,
        selectSet: [{ name: 'folderTraversal' }],
      },
      {
        attributes: { 'xsi:type': 'TraversalSpec' },
        name: 'datacenterDsTraversal',
        type: 'Datacenter',
        path: 'datastoreFolder',
        skip: false,
        selectSet: [{ name: 'folderTraversal' }],
      },
      {
        attributes: { 'xsi:type': 'TraversalSpec' },
        name: 'computeResourceTraversal',
        type: 'ComputeResource',
        path: 'host',
        skip: false,
      },
      {
        attributes: { 'xsi:type': 'TraversalSpec' },
        name: 'hostTraversal',
        type: 'HostSystem',
        path: 'vm',
        skip: false,
        selectSet: [{ name: 'folderTraversal' }],
      },
    ];
  }
}
