import { EventEmitter, Injectable } from '@angular/core';


export enum IORegisterType {

    READ_WRITE = 1,
    READ_ONLY = 2

}

export enum IORegisterOperationType {

    READ = 1,
    WRITE = 2

}

export class IORegister {

    public registerType: IORegisterType;
    public address: number;
    public value: number;
    public operationEventEmitter: EventEmitter<IORegisterOperation>;

    constructor(address: number, operationEventEmitter: EventEmitter<IORegisterOperation> = null,
                registerType: IORegisterType = IORegisterType.READ_WRITE, initialValue: number = 0) {

        this.address = address;
        this.registerType = registerType;
        this.value = initialValue;
        this.operationEventEmitter = operationEventEmitter;

    }

}

export class IORegisterOperation {

    public operationType: IORegisterOperationType;
    public register: IORegister;

    constructor(operationType: IORegisterOperationType, register: IORegister) {

        this.operationType = operationType;
        this.register = register;

    }

}

@Injectable()
export class IORegMapService {

    public registersNum = 0;

    public registers: Array<IORegister> = [];
    public registersMap: Map<number, IORegister> = new Map<number, IORegister>();

    public lastAccess = -1;

    constructor() { }

    public addRegister(address: number, operationEventEmitter: EventEmitter<IORegisterOperation> = null,
                       registerType: IORegisterType = IORegisterType.READ_WRITE,
                       initialValue: number = 0): IORegister {

        /* We need to check that the address is within limits [0, 65535] */
        if (address < 0 || address > 65535) {

            throw Error(`Invalid addresses: ${address}`);

        }

        /* Then we need to check that the address is not already in use */
        if (this.registersMap.get(address) !== null) {

            throw Error(`Address ${address} is already in use`);

        }

        const ioRegister = new IORegister(address, operationEventEmitter, registerType, initialValue);
        this.registers.push(ioRegister);
        this.registersMap.set(address, ioRegister);
        this.registersNum += 1;

        return ioRegister;

    }

    public removeRegister(ioRegister: IORegister) {

        const index = this.registers.indexOf(ioRegister);

        if (index > -1) {
            this.registers.splice(index, 1);
        }

    }

    public load(address: number): number {

        const register = this.registersMap.get(address);

        if (register === null) {
            throw Error(`Invalid register address ${address}`);
        }

        this.lastAccess = address;

        if (register.operationEventEmitter != null) {

            register.operationEventEmitter.emit(new IORegisterOperation(IORegisterOperationType.READ, register));

        }

        return register.value;

    }

    public store(address: number, value: number) {

        const register = this.registersMap.get(address);

        if (register === null) {
            throw Error(`Invalid register address ${address}`);
        }

        if (register.registerType === IORegisterType.READ_ONLY) {
            throw Error(`Invalid storage into read-only register ${address}`);
        }

        this.lastAccess = address;
        register.value = value;

        if (register.operationEventEmitter != null) {

            register.operationEventEmitter.emit(new IORegisterOperation(IORegisterOperationType.WRITE, register));

        }

    }

}
