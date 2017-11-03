import { Injectable } from '@angular/core';

import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';

export enum MemoryCellType {

    READ_WRITE = 1,
    READ_ONLY = 2

}

export enum MemoryOperationType {

    RESET = 0,
    SIZE_CHANGE = 1,
    READ_CELL = 2,
    WRITE_CELL = 3,
    WRITE_CELLS = 4,
    ADD_REGION = 5,
    REMOVE_REGION = 6

}

class MemoryCell {

    public address: number;
    public cellType: MemoryCellType;
    public dataValue: number;
    public memoryRegion: MemoryRegion;

    constructor(address: number, cellType: MemoryCellType = MemoryCellType.READ_WRITE,
                initialValue: number = 0, memoryRegion?: MemoryRegion) {

        this.address = address;
        this.cellType = cellType;
        this.dataValue = initialValue;
        this.memoryRegion = memoryRegion;

    }

}

export class MemoryOperation {

    public operationType: MemoryOperationType;
    public data: Map<string, any>;

    constructor(operationType: MemoryOperationType, data: Map<string, any>) {

        this.operationType = operationType;
        this.data = data;

    }

}

/**
 * Memory region class.
 */
export class MemoryRegion {

    public name: string;

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
    public cellType: MemoryCellType;

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
    public operationSource: Subject<MemoryOperation>;

    public lastAccess = -1;

    constructor(regionID: string, name: string, startAddress: number, endAddress: number,
                cellType: MemoryCellType = MemoryCellType.READ_WRITE,
                operationSource?: Subject<MemoryOperation>) {

        this.regionID = regionID;
        this.name = name;
        this.startAddress = startAddress;
        this.endAddress = endAddress;
        this.cellType = cellType;
        this.operationSource = operationSource;
        this.size = endAddress - startAddress + 1;

    }

}

@Injectable()
export class MemoryService {

    private memoryCells: Array<MemoryCell>;

    private size = 1024;

    private lastAccess = -1;

    private memoryRegions: Map<string, MemoryRegion> = new Map<string, MemoryRegion>();

    private memoryOperationSource = new Subject<MemoryOperation>();

    public memoryOperation$: Observable<MemoryOperation>;

    constructor() {

        this.memoryCells = Array<MemoryCell>(this.size);
        for (let i = 0; i < this.size; i++) {
            this.memoryCells[i] = new MemoryCell(i);
        }

        this.memoryOperation$ = this.memoryOperationSource.asObservable();

    }

    public getSize(): number {

        return this.size;

    }

    public addMemoryRegion(name: string, startAddress: number, endAddress: number,
                           cellType: MemoryCellType = MemoryCellType.READ_WRITE,
                           initialValue: number = 0, operationSource?: Subject<MemoryOperation>): string {

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

        for (const memoryRegion of Array.from(this.memoryRegions.values())) {

            if ((startAddress === memoryRegion.startAddress) ||
                (endAddress === memoryRegion.endAddress) ||
                ((startAddress < memoryRegion.startAddress) &&
                    (endAddress >= memoryRegion.startAddress)) ||
                ((startAddress > memoryRegion.startAddress) &&
                    (startAddress <= memoryRegion.endAddress))) {

                throw Error(`New region (${startAddress}, ${endAddress}) overlaps with ` +
                    `a existing one (${memoryRegion.startAddress}, ${memoryRegion.endAddress})`);

            }

        }

        /* Next step: obtain a new unused memory region ID */

        let newID: string;

        for (;;) {

            newID = Math.random().toString(36).substring(8);
            if (this.memoryRegions.has(newID) === false) {

                break;

            }

        }

        /* Now we can insert the new memory region */
        const newMemoryRegion = new MemoryRegion(newID, name, startAddress, endAddress,
            cellType, operationSource);
        this.memoryRegions.set(newID, newMemoryRegion);

        for (let i = startAddress; i <= endAddress; i++) {
            this.memoryCells[i].cellType = cellType;
            this.memoryCells[i].dataValue = initialValue;
            this.memoryCells[i].memoryRegion = newMemoryRegion;
        }

        const parameters: Map<string, any> = new Map<string, any>();
        parameters.set('regionID', newID);
        parameters.set('name', name);
        parameters.set('startAddress', startAddress);
        parameters.set('endAddress', endAddress);
        parameters.set('cellType', cellType);
        parameters.set('initialValue', initialValue);

        this.memoryOperationSource.next(new MemoryOperation(MemoryOperationType.ADD_REGION, parameters));

        return newID;

    }

    public removeMemoryRegion(regionID: string) {

        const memoryRegion = this.memoryRegions.get(regionID);

        if (memoryRegion) {

            for (let i = memoryRegion.startAddress; i <= memoryRegion.endAddress; i++) {

                this.memoryCells[i].memoryRegion = undefined;
                this.memoryCells[i].cellType = MemoryCellType.READ_WRITE;
                this.memoryCells[i].dataValue = 0;

            }

            this.memoryRegions.delete(regionID);

            const parameters: Map<string, any> = new Map<string, any>();
            parameters.set('regionID', memoryRegion.regionID);

            this.memoryOperationSource.next(new MemoryOperation(MemoryOperationType.REMOVE_REGION, parameters));

        }

    }

    public setMemorySize(size: number): Array<MemoryCell> {

        this.lastAccess = -1;
        this.size = size;
        this.memoryCells = new Array(this.size);

        for (let i = 0; i < this.size; i++) {
            this.memoryCells[i] = new MemoryCell(i);
        }

        this.memoryRegions.clear();

        const parameters: Map<string, any> = new Map<string, any>();
        parameters.set('size', size);
        this.memoryOperationSource.next(new MemoryOperation(MemoryOperationType.SIZE_CHANGE, parameters));

        return this.memoryCells;

    }

    public load(address: number): number {

        if (address < 0 || address > this.size) {
            throw Error('Memory access violation at ' + address);
        }

        this.lastAccess = address;

        const parameters: Map<string, any> = new Map<string, any>();
        parameters.set('address', address);
        parameters.set('value', this.memoryCells[address].dataValue);

        if (this.memoryCells[address].memoryRegion) {

            this.memoryCells[address].memoryRegion.lastAccess = address;

            if (this.memoryCells[address].memoryRegion.operationSource) {

                this.memoryCells[address].memoryRegion.operationSource.next(
                    new MemoryOperation(MemoryOperationType.READ_CELL, parameters));

            }

        }

        this.memoryOperationSource.next(new MemoryOperation(MemoryOperationType.REMOVE_REGION, parameters));

        return this.memoryCells[address].dataValue;

    }

    public store(address: number, value: number) {

        if (address < 0 || address > this.size) {
            throw Error(`Memory access violation at ${address}`);
        }

        if (isNaN(value)) {
            throw Error('Invalid value (Nan)');
        }

        if (value < 0 || value > 255) {
            throw Error(`Invalid data value ${value}`);
        }

        if (this.memoryCells[address].cellType === MemoryCellType.READ_ONLY) {
            throw Error(`Invalid storage into read-only cell ${address}`);
        }

        this.lastAccess = address;
        this.memoryCells[address].dataValue = value;

        const parameters: Map<string, any> = new Map<string, any>();
        parameters.set('address', address);
        parameters.set('value', value);

        if (this.memoryCells[address].memoryRegion) {

            this.memoryCells[address].memoryRegion.lastAccess = address;

            if (this.memoryCells[address].memoryRegion.operationSource) {

                this.memoryCells[address].memoryRegion.operationSource.next(
                    new MemoryOperation(MemoryOperationType.WRITE_CELL, parameters));

            }
        }

        this.memoryOperationSource.next(new MemoryOperation(MemoryOperationType.WRITE_CELL, parameters));

    }

    public multiStore(initialAddress: number, values: Array<number>) {

        if (initialAddress < 0 || (initialAddress + values.length) > this.size) {
            throw Error(`Memory access violation at (${initialAddress}, ${initialAddress + values.length}`);
        }

        for (let i = 0; i < values.length; i++) {

            if (values[i] < 0 || values[i] > 255) {
                throw Error(`Invalid data value [${i}]: ${values[i]}`);
            }

            if (this.memoryCells[initialAddress + i].cellType === MemoryCellType.READ_ONLY) {
                throw Error(`Invalid storage into read-only cell ${initialAddress + i}`);
            }

            if (this.memoryCells[initialAddress + i].memoryRegion) {
                throw Error(`Invalid multi-storage on a memory region (${this.memoryCells[initialAddress + i].memoryRegion.regionID}`);
            }

        }

        for (let i = 0; i < values.length; i++) {

            this.memoryCells[initialAddress + i].dataValue = values[i];

        }

        this.lastAccess = initialAddress + values.length;

        const parameters: Map<string, any> = new Map<string, any>();
        parameters.set('initialAddress', initialAddress);
        parameters.set('values', values);
        this.memoryOperationSource.next(new MemoryOperation(MemoryOperationType.WRITE_CELLS, parameters));

    }

    public reset() {

        this.lastAccess = -1;

        for (let i = 0; i < this.memoryCells.length; i++) {

            this.memoryCells[i].memoryRegion = undefined;
            this.memoryCells[i].cellType = MemoryCellType.READ_WRITE;
            this.memoryCells[i].dataValue = 0;

        }

        this.memoryRegions.clear();

        this.memoryOperationSource.next(new MemoryOperation(MemoryOperationType.RESET, undefined));

    }

}
