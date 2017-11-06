import { Injectable } from '@angular/core';

import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';

export enum IORegisterType {

    READ_WRITE = 1,
    READ_ONLY = 2

}

export enum IORegisterOperationType {

    RESET = 0,
    READ = 1,
    WRITE = 2,
    ADD_REGISTER = 3,
    REMOVE_REGISTER = 4

}

export class IORegister {

    public name: string;
    public description: string;
    public address: number;
    public registerType: IORegisterType;
    public value: number;
    public operationSource: Subject<IORegisterOperation>;

    constructor(name: string, address: number,
                initialValue: number = 0,
                registerType: IORegisterType = IORegisterType.READ_WRITE,
                operationSource?: Subject<IORegisterOperation>,
                description?: string) {

        this.name = name;
        this.description = description;
        this.address = address;
        this.registerType = registerType;
        this.value = initialValue;
        this.operationSource = operationSource;

    }

}

export class IORegisterOperation {

    public operationType: IORegisterOperationType;
    public data: Map<string, any>;

    constructor(operationType: IORegisterOperationType, data: Map<string, any>) {

        this.operationType = operationType;
        this.data = data;

    }

}

@Injectable()
export class IORegMapService {

    private registersMap: Map<number, IORegister> = new Map<number, IORegister>();

    private lastAccess = -1;

    private ioRegisterOperationSource = new Subject<IORegisterOperation>();

    public ioRegisterOperation$: Observable<IORegisterOperation>;

    constructor() {

        this.ioRegisterOperation$ = this.ioRegisterOperationSource.asObservable();

    }

    public getRegistersMap(): Map<number, IORegister> {
        return this.registersMap;
    }

    public addRegister(name: string, address: number,
                       initialValue: number = 0,
                       registerType: IORegisterType = IORegisterType.READ_WRITE,
                       operationSource?: Subject<IORegisterOperation>,
                       description?: string): number {

        /* We need to check that the address is within limits [0, 65535] */
        if (address < 0 || address > 65535) {

            throw Error(`Invalid addresses: ${address}`);

        }

        /* Then we need to check that the address is not already in use */
        if (this.registersMap.has(address) === true) {

            throw Error(`Address ${address} is already in use`);

        }

        const ioRegister = new IORegister(name, address, initialValue, registerType, operationSource, description);
        this.registersMap.set(address, ioRegister);

        const parameters: Map<string, any> = new Map<string, any>();
        parameters.set('name', name);
        parameters.set('address', address);
        parameters.set('description', address);
        parameters.set('registerType', registerType);
        parameters.set('initialValue', initialValue);

        this.ioRegisterOperationSource.next(new IORegisterOperation(IORegisterOperationType.ADD_REGISTER, parameters));

        return address;

    }

    public removeRegister(address: number) {

        const register = this.registersMap.get(address);

        if (register) {

            this.registersMap.delete(address);

            const parameters: Map<string, any> = new Map<string, any>();
            parameters.set('address', address);

            this.ioRegisterOperationSource.next(new IORegisterOperation(IORegisterOperationType.REMOVE_REGISTER, parameters));

        }

    }

    public load(address: number): number {

        const register = this.registersMap.get(address);

        if (register === undefined) {
            throw Error(`Invalid register address ${address}`);
        }

        this.lastAccess = address;

        const parameters: Map<string, any> = new Map<string, any>();
        parameters.set('address', address);
        parameters.set('value', register.value);

        if (register.operationSource !== undefined) {

            register.operationSource.next(new IORegisterOperation(IORegisterOperationType.READ, parameters));

        }

        this.ioRegisterOperationSource.next(new IORegisterOperation(IORegisterOperationType.READ, parameters));

        return register.value;

    }

    public store(address: number, value: number) {

        const register = this.registersMap.get(address);

        if (register === undefined) {
            throw Error(`Invalid register address ${address}`);
        }

        if (register.registerType === IORegisterType.READ_ONLY) {
            throw Error(`Invalid storage into read-only register ${address}`);
        }

        this.lastAccess = address;
        register.value = value;

        const parameters: Map<string, any> = new Map<string, any>();
        parameters.set('address', address);
        parameters.set('value', value);

        if (register.operationSource !== undefined) {

            register.operationSource.next(new IORegisterOperation(IORegisterOperationType.WRITE, parameters));

        }

        this.ioRegisterOperationSource.next(new IORegisterOperation(IORegisterOperationType.WRITE, parameters));

    }

}
