import { Injectable } from '@angular/core';

import { Subject, Observable } from 'rxjs';
import { EventsLogService, SystemEvent } from './events-log.service';

import { Utils } from './utils';

export enum IORegisterType {

    READ_WRITE = 1,
    READ_ONLY = 2

}

export enum IORegisterOperationType {

    READ = 0,
    WRITE = 1,
    ADD_REGISTER = 2

}

export interface IORegisterOperationParamsReadWrite {

    name: string;
    address: number;
    value: number;

}

export interface IORegisterOperationAddRegister {

    name: string;
    address: number;
    description: string;
    registerType: IORegisterType;
    initialValue: number;

}

type IORegisterOperationParams = IORegisterOperationParamsReadWrite | IORegisterOperationAddRegister;

export class IORegisterOperation implements SystemEvent {

    public operationType: IORegisterOperationType;
    public data: IORegisterOperationParams;

    constructor(operationType: IORegisterOperationType, data: IORegisterOperationParams) {

        this.operationType = operationType;
        this.data = data;

    }

    public toString(): string {

        let ret, params;

        switch (this.operationType) {

            case IORegisterOperationType.READ:
                params = <IORegisterOperationParamsReadWrite>this.data;
                ret = `IOREG: Read register ${params.name} [0x${Utils.pad(params.address, 16, 4)}] => 0x${Utils.pad(params.value, 16, 2)}`
                break;
            case IORegisterOperationType.WRITE:
                params = <IORegisterOperationParamsReadWrite>this.data;
                ret = `IOREG: Write word 0x${Utils.pad(params.value, 16, 4)} to register ${params.name} ` +
                      `[0x${Utils.pad(params.address, 16, 4)}]`;
                break;
            case IORegisterOperationType.ADD_REGISTER:
                params = <IORegisterOperationAddRegister>this.data;
                ret = `IOREG: Add register ${params.name} at address 0x${Utils.pad(params.address, 16, 4)}`;
                break;
        }

        return ret;

    }

}

type PublishIORegisterOperation = (operation: IORegisterOperation) => void;

export class IORegister {

    public name: string;
    public description: string;
    public address: number;
    public registerType: IORegisterType;
    public value: number;
    public publishIORegisterOperation: PublishIORegisterOperation;

    constructor(name: string, address: number,
                initialValue: number = 0,
                registerType: IORegisterType = IORegisterType.READ_WRITE,
                publishIORegisterOperation?: PublishIORegisterOperation,
                description?: string) {

        this.name = name;
        this.description = description;
        this.address = address;
        this.registerType = registerType;
        this.value = initialValue;
        this.publishIORegisterOperation = publishIORegisterOperation;

    }

}


@Injectable()
export class IORegMapService {

    private registersMap: Map<number, IORegister> = new Map<number, IORegister>();

    private lastAccess = -1;

    private ioRegisterOperationSource = new Subject<IORegisterOperation>();

    public ioRegisterOperation$: Observable<IORegisterOperation>;

    constructor(private eventLogService: EventsLogService) {

        this.ioRegisterOperation$ = this.ioRegisterOperationSource.asObservable();

    }

    private publishIORegisterOperation(operation: IORegisterOperation) {

        this.eventLogService.log(operation);
        this.ioRegisterOperationSource.next(operation);

    }

    public getRegistersMap(): Map<number, IORegister> {
        return this.registersMap;
    }

    public addRegister(name: string, address: number,
                       initialValue: number = 0,
                       registerType: IORegisterType = IORegisterType.READ_WRITE,
                       publishIORegisterOperation?: PublishIORegisterOperation,
                       description?: string): number {

        /* We need to check that the address is within limits [0, 65535] */
        if (address < 0 || address > 65535) {

            throw Error(`Invalid addresses: ${address}`);

        }

        /* Then we need to check that the address is not already in use */
        if (this.registersMap.has(address) === true) {

            throw Error(`Address ${address} is already in use`);

        }

        const ioRegister = new IORegister(name, address, initialValue, registerType,
            publishIORegisterOperation, description);

        this.registersMap.set(address, ioRegister);

        const parameters: IORegisterOperationAddRegister = {
            name: name,
            address: address,
            description: description,
            registerType: registerType,
            initialValue: initialValue,
        };

        this.publishIORegisterOperation(new IORegisterOperation(IORegisterOperationType.ADD_REGISTER, parameters));

        return address;

    }

    public load(address: number, publish: boolean = true): number {

        const register = this.registersMap.get(address);

        if (register === undefined) {
            throw Error(`Invalid register address ${address}`);
        }

        this.lastAccess = address;

        const parameters: IORegisterOperationParamsReadWrite = {
            name: register.name,
            address: address,
            value: register.value
        };

        const operation = new IORegisterOperation(IORegisterOperationType.READ, parameters);

        this.publishIORegisterOperation(operation);

        if (register.publishIORegisterOperation !== undefined && publish === true) {

            register.publishIORegisterOperation(operation);

        }

        return register.value;

    }

    public store(address: number, value: number, isInstruction: boolean = true, publish: boolean = true) {

        const register = this.registersMap.get(address);

        if (register === undefined) {
            throw Error(`Invalid register address ${address}`);
        }

        if (register.registerType === IORegisterType.READ_ONLY && isInstruction === true) {
            throw Error(`Invalid storage into read-only register ${address}`);
        }

        this.lastAccess = address;
        register.value = value;

        const parameters: IORegisterOperationParamsReadWrite = {
            name: register.name,
            address: address,
            value: value
        };

        const operation = new IORegisterOperation(IORegisterOperationType.WRITE, parameters);

        this.publishIORegisterOperation(operation);

        if (register.publishIORegisterOperation !== undefined && publish === true) {

            register.publishIORegisterOperation(operation);

        }

    }

}
