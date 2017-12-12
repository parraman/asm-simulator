import { Injectable } from '@angular/core';

import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';

import { Utils } from './utils';
import { EventsLogService, SystemEvent } from './events-log.service';

export enum MemoryCellAccessPermission {

    READ_WRITE = 0,
    READ_ONLY = 1

}

export enum MemoryOperationType {

    RESET = 0,
    LOAD_BYTE = 1,
    STORE_BYTE = 2,
    STORE_BYTES = 3,
    LOAD_WORD = 4,
    STORE_WORD = 5,
    ADD_REGION = 6

}

export interface MemoryOperationParamsLoadStore {

    address: number;
    value: number;

}

export interface MemoryOperationParamsStoreBytes {

    initialAddress: number;
    size: number;
    values: Array<number>;

}

export interface MemoryOperationParamsAddRegion {

    regionID: string;
    name: string;
    startAddress: number;
    endAddress: number;
    accessPermissions: MemoryCellAccessPermission;
    initialValues: Array<number>;

}

type MemoryOperationParams = MemoryOperationParamsLoadStore | MemoryOperationParamsStoreBytes |
    MemoryOperationParamsAddRegion;

export class MemoryOperation implements SystemEvent {

    public operationType: MemoryOperationType;
    public data: MemoryOperationParams;

    constructor(operationType: MemoryOperationType, data?: MemoryOperationParams) {

        this.operationType = operationType;
        this.data = data;

    }

    toString(): string {

        let ret, params;

        switch (this.operationType) {

            case MemoryOperationType.RESET:
                ret = `MEM: Reset memory`;
                break;
            case MemoryOperationType.LOAD_BYTE:
                params = <MemoryOperationParamsLoadStore>this.data;
                ret = `MEM: Load byte from [0x${Utils.pad(params.address, 16, 4)}] => 0x${Utils.pad(params.value, 16, 2)}`;
                break;
            case MemoryOperationType.STORE_BYTE:
                params = <MemoryOperationParamsLoadStore>this.data;
                ret = `MEM: Store byte 0x${Utils.pad(params.value, 16, 2)} at [0x${Utils.pad(params.address, 16, 4)}]`;
                break;
            case MemoryOperationType.STORE_BYTES:
                params = <MemoryOperationParamsStoreBytes>this.data;
                if (params.values) {
                    ret = `MEM: Store ${params.size} bytes at [0x${Utils.pad(params.initialAddress, 16, 4)}]`;
                } else {
                    ret = `MEM: Clear ${params.size} bytes at [0x${Utils.pad(params.initialAddress, 16, 4)}]`;
                }
                break;
            case MemoryOperationType.LOAD_WORD:
                params = <MemoryOperationParamsLoadStore>this.data;
                ret = `MEM: Load word from [0x${Utils.pad(params.address, 16, 4)}] => 0x${Utils.pad(params.value, 16, 4)}`;
                break;
            case MemoryOperationType.STORE_WORD:
                params = <MemoryOperationParamsLoadStore>this.data;
                ret = `MEM: Store word 0x${Utils.pad(params.value, 16, 4)} at [0x${Utils.pad(params.address, 16, 4)}]`;
                break;
            case MemoryOperationType.ADD_REGION:
                params = <MemoryOperationParamsAddRegion>this.data;
                ret = `MEM: Add region ${params.name} at addresses ` +
                    `[0x${Utils.pad(params.startAddress, 16, 4)}, 0x${Utils.pad(params.endAddress, 16, 4)}]`;
                break;
            default:
                break;
        }

        return ret;

    }

}

class MemoryCell {

    public address: number;
    public accessPermissions: MemoryCellAccessPermission;
    public dataValue: number;
    public memoryRegion: MemoryRegion;

    constructor(address: number,
                accessPermissions: MemoryCellAccessPermission = MemoryCellAccessPermission.READ_WRITE,
                initialValue: number = 0, memoryRegion?: MemoryRegion) {

        this.address = address;
        this.accessPermissions = accessPermissions;
        this.dataValue = initialValue;
        this.memoryRegion = memoryRegion;

    }

}

type PublishMemoryOperation = (operation: MemoryOperation) => void;

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
     * Access permissions (Read/write or Read-only).
     */
    public accessPermissions: MemoryCellAccessPermission;

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
    public publishMemoryOperation: PublishMemoryOperation;

    public lastAccess = -1;

    constructor(regionID: string, name: string, startAddress: number, endAddress: number,
                accessPermissions: MemoryCellAccessPermission = MemoryCellAccessPermission.READ_WRITE,
                publishMemoryOperation?: PublishMemoryOperation) {

        this.regionID = regionID;
        this.name = name;
        this.startAddress = startAddress;
        this.endAddress = endAddress;
        this.accessPermissions = accessPermissions;
        this.publishMemoryOperation = publishMemoryOperation;
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

    constructor(private eventsLogService: EventsLogService) {

        this.memoryCells = Array<MemoryCell>(this.size);
        for (let i = 0; i < this.size; i++) {
            this.memoryCells[i] = new MemoryCell(i);
        }

        this.memoryOperation$ = this.memoryOperationSource.asObservable();

    }

    public getSize(): number {

        return this.size;

    }

    private publishMemoryOperation(operation: MemoryOperation) {

        this.eventsLogService.log(operation);
        this.memoryOperationSource.next(operation);

    }

    public addMemoryRegion(name: string, startAddress: number, endAddress: number,
                           accessPermissions: MemoryCellAccessPermission = MemoryCellAccessPermission.READ_WRITE,
                           initialValues?: Array<number>, publishMemoryOperation?: PublishMemoryOperation): string {

        /* We need to first check that startAddress and endAddress are valid, i.e.:
           - startAddress >= 0 AND endAddress < size AND
           - startAddress <= endAddress
         */

        if (startAddress < 0 || endAddress >= this.size || startAddress >= endAddress) {

            throw Error(`Invalid addresses: (${startAddress}, ${endAddress})`);

        }

        if (initialValues && (initialValues.length !== (endAddress - startAddress + 1))) {

            throw Error(`Invalid size of the array of initial values: ${initialValues.length}`);

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
            accessPermissions, publishMemoryOperation);
        this.memoryRegions.set(newID, newMemoryRegion);

        for (let i = startAddress; i <= endAddress; i++) {
            this.memoryCells[i].accessPermissions = accessPermissions;
            this.memoryCells[i].dataValue = initialValues ? initialValues[i] : 0;
            this.memoryCells[i].memoryRegion = newMemoryRegion;
        }

        const parameters: MemoryOperationParamsAddRegion = {
            regionID: newID,
            name: name,
            startAddress: startAddress,
            endAddress: endAddress,
            accessPermissions: accessPermissions,
            initialValues: initialValues
        };

        this.publishMemoryOperation(new MemoryOperation(MemoryOperationType.ADD_REGION, parameters));

        return newID;

    }

    public loadByte(address: number, publish: boolean = true): number {

        if (address < 0 || address > this.size) {
            throw Error('Memory access violation at ' + address);
        }

        this.lastAccess = address;

        const parameters: MemoryOperationParamsLoadStore = {
            address: address,
            value: this.memoryCells[address].dataValue
        };

        const operation = new MemoryOperation(MemoryOperationType.LOAD_BYTE, parameters);

        this.publishMemoryOperation(operation);

        if (this.memoryCells[address].memoryRegion) {

            this.memoryCells[address].memoryRegion.lastAccess = address;

            if (this.memoryCells[address].memoryRegion.publishMemoryOperation && publish === true) {

                this.memoryCells[address].memoryRegion.publishMemoryOperation(operation);

            }

        }

        return this.memoryCells[address].dataValue;

    }

    public storeByte(address: number, value: number, isInstruction: boolean = true,
                     publish: boolean = true) {

        if (address < 0 || address > this.size) {
            throw Error(`Memory access violation at ${address}`);
        }

        if (isNaN(value)) {
            throw Error('Invalid value (Nan)');
        }

        if (value < 0 || value > 255) {
            throw Error(`Invalid data value ${value}`);
        }

        if (isInstruction === true &&
            (this.memoryCells[address].accessPermissions === MemoryCellAccessPermission.READ_ONLY)) {

            throw Error(`Invalid storage into read-only cell ${address} in supervisor mode`);

        }

        this.lastAccess = address;
        this.memoryCells[address].dataValue = value;

        const parameters: MemoryOperationParamsLoadStore = {
            address: address,
            value: value
        };

        const operation = new MemoryOperation(MemoryOperationType.STORE_BYTE, parameters);

        this.publishMemoryOperation(operation);

        if (this.memoryCells[address].memoryRegion) {

            this.memoryCells[address].memoryRegion.lastAccess = address;

            if (this.memoryCells[address].memoryRegion.publishMemoryOperation && publish === true) {

                this.memoryCells[address].memoryRegion.publishMemoryOperation(operation);

            }
        }


    }

    public storeBytes(initialAddress: number, size: number, values?: Array<number>) {

        if (initialAddress < 0 || (initialAddress + size) > this.size) {
            throw Error(`Memory access violation at (${initialAddress}, ${initialAddress + size}`);
        }

        if (values) {

            for (let i = 0; i < values.length; i++) {

                if (values[i] < 0 || values[i] > 255) {
                    throw Error(`Invalid data value [${i}]: ${values[i]}`);
                }

            }

        }

        for (let i = 0; i < size; i++) {

            this.memoryCells[initialAddress + i].dataValue = values ? values[i] : 0;

        }

        this.lastAccess = initialAddress + size;

        const parameters: MemoryOperationParamsStoreBytes = {
            initialAddress: initialAddress,
            size: size,
            values: values
        };

        this.publishMemoryOperation(new MemoryOperation(MemoryOperationType.STORE_BYTES, parameters));

    }

    public loadWord(address: number, publish: boolean = true): number {

        if (address < 0 || address >= this.size) {
            throw Error('Memory access violation at ' + address);
        }

        this.lastAccess = address;

        const word = (this.memoryCells[address].dataValue << 8) +
            (this.memoryCells[address + 1].dataValue);

        const parameters: MemoryOperationParamsLoadStore = {
            address: address,
            value: word
        };

        const operation = new MemoryOperation(MemoryOperationType.LOAD_WORD, parameters);

        this.publishMemoryOperation(operation);

        if (this.memoryCells[address].memoryRegion) {

            this.memoryCells[address].memoryRegion.lastAccess = address;

            if (this.memoryCells[address].memoryRegion.publishMemoryOperation && publish === true) {

                this.memoryCells[address].memoryRegion.publishMemoryOperation(operation);

            }

        }

        return word;

    }

    public storeWord(address: number, value: number, isInstruction: boolean = true,
                     publish: boolean = true) {

        if (address < 0 || address >= this.size) {
            throw Error(`Memory access violation at ${address}`);
        }

        if (isNaN(value)) {
            throw Error('Invalid value (Nan)');
        }

        if (value < 0 || value > 65535) {
            throw Error(`Invalid data value ${value}`);
        }

        if (isInstruction === true &&
            (this.memoryCells[address].accessPermissions === MemoryCellAccessPermission.READ_ONLY ||
             this.memoryCells[address + 1].accessPermissions === MemoryCellAccessPermission.READ_ONLY)) {

            throw Error(`Invalid storage into read-only cell ${address}`);

        }

        this.lastAccess = address;

        const msb = (value & 0xFF00) >>> 8;
        const lsb = (value & 0x00FF);

        this.memoryCells[address].dataValue = msb;
        this.memoryCells[address + 1].dataValue = lsb;

        const parameters: MemoryOperationParamsLoadStore = {
            address: address,
            value: value
        };

        const operation = new MemoryOperation(MemoryOperationType.STORE_WORD, parameters);

        this.publishMemoryOperation(operation);

        if (this.memoryCells[address].memoryRegion) {

            this.memoryCells[address].memoryRegion.lastAccess = address;

            if (this.memoryCells[address].memoryRegion.publishMemoryOperation && publish === true) {

                this.memoryCells[address].memoryRegion.publishMemoryOperation(operation);

            }
        }

    }

    public reset() {

        this.lastAccess = -1;

        for (let i = 0; i < this.memoryCells.length; i++) {

            if (this.memoryCells[i].memoryRegion === undefined) {
                this.memoryCells[i].dataValue = 0;
            }

        }

        this.publishMemoryOperation(new MemoryOperation(MemoryOperationType.RESET));

    }

}
