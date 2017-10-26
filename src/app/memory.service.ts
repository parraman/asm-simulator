import {EventEmitter, Injectable} from '@angular/core';

export enum CellType {

  READ_WRITE = 1,
  READ_ONLY = 2

}

export enum OperationType {

  READ = 1,
  WRITE = 2

}

export class MemoryCell {

  public cellType: CellType;
  public dataValue: number;
  public memoryRegion: MemoryRegion;

  constructor() {

    this.cellType = CellType.READ_WRITE;
    this.dataValue = 0;
    this.memoryRegion = null;

  }

}

export class MemoryOperation {

  public operationType: OperationType;
  public memoryCell: MemoryCell;

  constructor(operationType: OperationType, memoryCell: MemoryCell) {

    this.operationType = operationType;
    this.memoryCell = memoryCell;

  }

}

/**
 * Memory region class.
 */
export class MemoryRegion {

  /**
   * Initial address of the memory region.
   */
  public startAddress: number;

  /**
   * Final address of the memory region.
   */
  public endAddress: number;

  /**
   * Type of memory cells within the region (Read/write or Read-only).
   */
  public cellType: CellType;

  /**
   * Size in bytes of the memory region.
   */
  public size: number;

  /**
   * Unique ID of the memory region.
   */
  public regionID: string;

  /**
   * Event emitter throw which the operations done to a cell within the region will be broadcasted.
   */
  public operationEventEmitter: EventEmitter<MemoryOperation>;
  public lastAccess: number;

  constructor(regionID: string, startAddress: number, endAddress: number,
              cellType: CellType, operationEventEmitter: EventEmitter<MemoryOperation>) {

    this.regionID = regionID;
    this.startAddress = startAddress;
    this.endAddress = endAddress;
    this.cellType = cellType;
    this.operationEventEmitter = operationEventEmitter;
    this.lastAccess = -1;
    this.size = endAddress - startAddress + 1;

  }

}

@Injectable()
export class MemoryService {

  public data: Array<MemoryCell>;

  private size = 1024;

  public lastAccess = -1;

  private memoryRegions: Array<MemoryRegion> = [];

  constructor() {

    this.data = Array<MemoryCell>(this.size);
    for (let i = 0; i < this.size; i++) {
      this.data[i] = new MemoryCell();
    }

  }

  public addMemoryRegion(startAddress: number, endAddress: number,
                         cellType: CellType, operationEventEmitter: EventEmitter<MemoryOperation> ): MemoryRegion {

    /* We need to first check that startAddress and endAddress are valid, i.e.:
       - startAddress >= 0 AND endAddress < size AND
       - startAddress <= endAddress
     */

    if (startAddress < 0 || endAddress >= this.size || startAddress >= endAddress) {

      throw Error(`Invalid addresses: (${startAddress}, ${endAddress})`);

    }

    /* Now we need to check if the selected memory region overlaps with a previously
       existing one. */

    /* The overlapping will happen iff:
       1) new startAddress == any previously existing region's startAddress OR
       2) new endAddress == any previously existing region's endAddress OR
       3) ((new startAddress < any previously existing region's startAddress) AND
           (new endAddress >= any previously existing region's startAddress)) OR
       4) ((new startAddress > any previously existing region's startAddress) AND
           (new startAddress <= any previously existing region's endAddress))
     */

    for (let i = 0; i < this.memoryRegions.length; i++) {

      if ((startAddress === this.memoryRegions[i].startAddress) ||
        (endAddress === this.memoryRegions[i].endAddress) ||
        ((startAddress < this.memoryRegions[i].startAddress) &&
          (endAddress >= this.memoryRegions[i].startAddress)) ||
        ((startAddress > this.memoryRegions[i].startAddress) &&
          (startAddress <= this.memoryRegions[i].endAddress))) {

        throw Error(`New region (${startAddress}, ${endAddress}) overlaps with ` +
          `a existing one (${this.memoryRegions[i].startAddress}, ${this.memoryRegions[i].endAddress})`);

      }

    }

    /* Next step: obtain a new unused memory region ID */

    let newID: string;

    for (;;) {

      newID = Math.random().toString(36).substring(8);
      let found = false;

      for (let i = 0; i < this.memoryRegions.length; i++) {

        if (this.memoryRegions[i].regionID === newID) {
          found = true;
          break;
        }

      }
      if (found === false) {

        break;

      }

    }

    /* Now we can insert the new memory region */
    const newMemoryRegion = new MemoryRegion(newID, startAddress, endAddress, cellType, operationEventEmitter);
    this.memoryRegions.push(newMemoryRegion);

    for (let i = startAddress; i <= endAddress; i++) {
      this.data[i].cellType = cellType;
      this.data[i].dataValue = 0;
      this.data[i].memoryRegion = newMemoryRegion;
    }

    return newMemoryRegion;

  }

  public removeMemoryRegion(memoryRegion: MemoryRegion) {

    const index = this.memoryRegions.indexOf(memoryRegion);

    if (index > -1) {
      this.memoryRegions.splice(index, 1);
    }

  }

  public setMemorySize(size: number): Array<MemoryCell> {

    this.lastAccess = -1;
    this.size = size;
    this.data = new Array(this.size);

    this.memoryRegions = [];

    return this.data;

  }

  public load(address: number): MemoryCell {

    if (address < 0 || address > this.size) {
      throw Error('Memory access violation at ' + address);
    }

    this.lastAccess = address;

    if (this.data[address].memoryRegion != null) {

      this.data[address].memoryRegion.operationEventEmitter.emit(new MemoryOperation(OperationType.READ, this.data[address]));

    }

    return this.data[address];

  }

  public store(address: number, value: number) {

    if (address < 0 || address > this.size) {
      throw Error('Memory access violation at ' + address);
    }

    if (value < 0 || value > 255) {
      throw Error('Invalid data value ' + value);
    }

    if (this.data[address].cellType === CellType.READ_ONLY) {
      throw Error(`Invalid storage into read-only cell ${address}`);
    }

    this.lastAccess = address;
    this.data[address].dataValue = value;

    if (this.data[address].memoryRegion != null) {

      this.data[address].memoryRegion.operationEventEmitter.emit(new MemoryOperation(OperationType.WRITE, this.data[address]));

    }

  }

  public reset() {

    this.lastAccess = -1;

    for (let i = 0; i < this.data.length; i++) {

      this.data[i].memoryRegion = null;
      this.data[i].cellType = CellType.READ_WRITE;
      this.data[i].dataValue = 0;

    }

    this.memoryRegions = [];

  }

}
