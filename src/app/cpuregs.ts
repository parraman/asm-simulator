import { Utils } from './utils';
import { SystemEvent } from './events-log.service';

export enum SRBit {

    HALT = 0,
    FAULT = 1,
    ZERO = 2,
    CARRY = 3,
    IRQMASK = 4,
    SUPERVISOR = 15

}

export enum CPURegisterIndex {

    A = 0,
    B = 1,
    C = 2,
    D = 3,
    SP = 4,
    USP = 5,
    SSP = 6,
    IP = 7,
    SR = 8,
    AH = 9,
    AL = 10,
    BH = 11,
    BL = 12,
    CH = 13,
    CL = 14,
    DH = 15,
    DL = 16

}

export function getRegisterSize(index: CPURegisterIndex): number {

    let size: number;

    switch (index) {

        case CPURegisterIndex.A:
        case CPURegisterIndex.B:
        case CPURegisterIndex.C:
        case CPURegisterIndex.D:
        case CPURegisterIndex.SP:
        case CPURegisterIndex.USP:
        case CPURegisterIndex.SSP:
        case CPURegisterIndex.IP:
        case CPURegisterIndex.SR:
            size = 16;
            break;
        case CPURegisterIndex.AH:
        case CPURegisterIndex.AL:
        case CPURegisterIndex.BH:
        case CPURegisterIndex.BL:
        case CPURegisterIndex.CH:
        case CPURegisterIndex.CL:
        case CPURegisterIndex.DH:
        case CPURegisterIndex.DL:
            size = 8;
            break;
    }

    return size;

}

export enum CPURegisterOperationType {

    READ = 1,
    WRITE = 2,
    READ_BIT = 3,
    WRITE_BIT = 4

}

export interface CPURegisterRegularOpParams {

    index: number;
    value: number;

}

export interface CPURegisterBitOpParams {

    index: number;
    bitNumber: number;
    value: number;

}


type CPURegisterOperationParams = CPURegisterRegularOpParams | CPURegisterBitOpParams;

export class CPURegisterOperation implements SystemEvent {

    public operationType: CPURegisterOperationType;
    public data: CPURegisterOperationParams;

    constructor(operationType: CPURegisterOperationType, data: CPURegisterOperationParams) {

        this.operationType = operationType;
        this.data = data;

    }

    toString(): string {

        let ret, params, pad;

        switch (this.operationType) {
            case CPURegisterOperationType.READ:
                params = <CPURegisterRegularOpParams>this.data;
                pad = getRegisterSize(params.index) / 4;
                ret = `REG: Read register 0x${Utils.pad(params.index, 16, 2)}: ${CPURegisterIndex[params.index]} ` +
                      `=> 0x${Utils.pad(params.value, 16, pad)}`;
                break;
            case CPURegisterOperationType.WRITE:
                params = <CPURegisterRegularOpParams>this.data;
                pad = getRegisterSize(params.index) / 4;
                const size = getRegisterSize(params.index) === 1 ? 'byte' : 'word';
                ret = `REG: Write ${size} 0x${Utils.pad(params.value, 16, pad)} to register ` +
                      ` 0x${Utils.pad(params.index, 16, 2)}: ${CPURegisterIndex[params.index]}`;
                break;
            case CPURegisterOperationType.READ_BIT:
                params = <CPURegisterBitOpParams>this.data;
                if (params.index === CPURegisterIndex.SR) {
                    ret = `REG: Read bit ${params.bitNumber}: ${SRBit[params.bitNumber]} of Status Register (SR) ` +
                        `=> ${params.value}`;
                } else {
                    ret = `REG: Read bit ${params.bitNumber} of register ` +
                        `0x${Utils.pad(params.index, 16, 2)}: ${CPURegisterIndex[params.index]} ` +
                        `=> ${params.value}`;
                }
                break;
            case CPURegisterOperationType.WRITE_BIT:
                params = <CPURegisterBitOpParams>this.data;
                const op = params.value === 0 ? 'Clear' : 'Set';
                if (params.index === CPURegisterIndex.SR) {
                    ret = `REG: ${op} bit ${params.bitNumber}: ${SRBit[params.bitNumber]} of Status Register (SR)`;
                } else {
                    ret = `REG: ${op} bit ${params.bitNumber} of register ` +
                        `0x${Utils.pad(params.index, 16, 2)}: ${CPURegisterIndex[params.index]}`;
                }
                break;
        }

        return ret;

    }

}

type PublishCPURegisterOperation = (operation: CPURegisterOperation) => void;

export class CPURegister {

    public name: string;
    public description: string;
    public index: number;
    public resetValue: number;

    protected _value: number;

    protected publishRegisterOperation: PublishCPURegisterOperation;

    constructor (name: string, index: number, resetValue: number,
                 publishRegisterOperation?: PublishCPURegisterOperation,
                 description?: string) {

        this.name = name;
        this.description = description;
        this.index = index;
        this.resetValue = resetValue;
        this._value = resetValue;
        this.publishRegisterOperation = publishRegisterOperation;

    }

    protected publishWriteBit(index: number, bitNumber: number,
                              newBitValue: number) {

        if (this.publishRegisterOperation) {

            const parameters: CPURegisterBitOpParams = {
                index: index,
                bitNumber: bitNumber,
                value: newBitValue
            };

            this.publishRegisterOperation(new CPURegisterOperation(CPURegisterOperationType.WRITE_BIT,
                parameters));

        }

    }

    protected publishReadBit(index: number, bitNumber: number,
                             readBitValue: number) {

        if (this.publishRegisterOperation) {

            const parameters: CPURegisterBitOpParams = {
                index: index,
                bitNumber: bitNumber,
                value: readBitValue
            };

            this.publishRegisterOperation(new CPURegisterOperation(CPURegisterOperationType.READ_BIT,
                parameters));

        }

    }

    protected publishWriteValue(index: number, newValue: number) {

        if (this.publishRegisterOperation) {

            const parameters: CPURegisterRegularOpParams = {
                index: index,
                value: newValue
            };

            this.publishRegisterOperation(new CPURegisterOperation(CPURegisterOperationType.WRITE,
                parameters));

        }

    }

    protected publishReadValue(index: number, readValue: number) {

        if (this.publishRegisterOperation) {

            const parameters: CPURegisterRegularOpParams = {
                index: index,
                value: readValue
            };

            this.publishRegisterOperation(new CPURegisterOperation(CPURegisterOperationType.READ,
                parameters));

        }

    }

    get value(): number {

        this.publishReadValue(this.index, this._value);
        return this._value;

    }

    get silentValue(): number {

        return this._value;

    }

    set value(newValue: number) {

        this._value = newValue;
        this.publishWriteValue(this.index, newValue);

    }

}

export class CPUGeneralPurposeRegister extends CPURegister {

    public indexHigh: number;
    public indexLow: number;

    constructor (name: string, index: number,
                 indexHigh: number, indexLow: number, resetValue: number,
                 publishRegisterOperation?: PublishCPURegisterOperation,
                 description?: string) {

        super(name, index, resetValue, publishRegisterOperation, description);

        this.indexHigh = indexHigh;
        this.indexLow = indexLow;

    }

    set low(newValue: number) {

        this._value = (this._value & 0xFF00) + newValue;
        this.publishWriteValue(this.indexLow, newValue);

    }

    get low() {

        const readValue = this._value & 0x00FF;
        this.publishReadValue(this.indexLow, readValue);

        return readValue;

    }

    set high(newValue: number) {

        this._value = (this._value & 0x00FF) + (newValue << 8);
        this.publishWriteValue(this.indexHigh, newValue);

    }

    get high() {

        const readValue = (this._value & 0xFF00) >>> 8;
        this.publishReadValue(this.indexHigh, readValue);

        return readValue;

    }
}

export class CPUStatusRegister extends CPURegister {

    private _halt = 0;
    private _fault = 0;
    private _zero = 0;
    private _carry = 0;
    private _irqMask = 0;
    private _supervisor = 0;

    constructor (name: string, index: number, initialValue: number,
                 publishRegisterOperation?: PublishCPURegisterOperation,
                 description?: string) {

        super(name, index, initialValue, publishRegisterOperation, description);

        if ((initialValue & (1 << SRBit.HALT)) !== 0) {
            this._halt = 1;
        }
        if ((initialValue & (1 << SRBit.FAULT)) !== 0) {
            this._fault = 1;
        }
        if ((initialValue & (1 << SRBit.ZERO)) !== 0) {
            this._zero = 1;
        }
        if ((initialValue & (1 << SRBit.CARRY)) !== 0) {
            this._carry = 1;
        }
        if ((initialValue & (1 << SRBit.IRQMASK)) !== 0) {
            this._irqMask = 1;
        }
        if ((initialValue & (1 << SRBit.SUPERVISOR)) !== 0) {
            this._supervisor = 1;
        }

    }

    get value(): number {

        this.publishReadValue(this.index, this._value);
        return this._value;

    }

    set value(newValue: number) {

        if ((newValue & (1 << SRBit.HALT)) !== 0) {
            this._halt = 1;
        } else {
            this._halt = 0;
        }
        if ((newValue & (1 << SRBit.FAULT)) !== 0) {
            this._fault = 1;
        } else {
            this._fault = 0;
        }
        if ((newValue & (1 << SRBit.ZERO)) !== 0) {
            this._zero = 1;
        } else {
            this._zero = 0;
        }
        if ((newValue & (1 << SRBit.CARRY)) !== 0) {
            this._carry = 1;
        } else {
            this._carry = 0;
        }
        if ((newValue & (1 << SRBit.IRQMASK)) !== 0) {
            this._irqMask = 1;
        } else {
            this._irqMask = 0;
        }
        if ((newValue & (1 << SRBit.SUPERVISOR)) !== 0) {
            this._supervisor = 1;
        } else {
            this._supervisor = 0;
        }

        this._value = newValue;
        this.publishWriteValue(this.index, newValue);

    }

    set halt(newValue: number) {

        if (newValue === 0) {
            this._halt = 0;
            this._value &= ~(1 << SRBit.HALT);
        } else {
            this._halt = 1;
            this._value |= (1 << SRBit.HALT);
        }

        this.publishWriteBit(this.index, SRBit.HALT, this._halt);

    }

    get halt(): number {

        this.publishReadBit(this.index, SRBit.HALT, this._halt);
        return this._halt;
    }

    set fault(newValue: number) {

        if (newValue === 0) {
            this._fault = 0;
            this._value &= ~(1 << SRBit.FAULT);
        } else {
            this._fault = 1;
            this._value |= (1 << SRBit.FAULT);
        }

        this.publishWriteBit(this.index, SRBit.FAULT, this._fault);

    }

    get fault(): number {

        this.publishReadBit(this.index, SRBit.FAULT, this._fault);
        return this._fault;
    }

    set zero(newValue: number) {

        if (newValue === 0) {
            this._zero = 0;
            this._value &= ~(1 << SRBit.ZERO);
        } else {
            this._zero = 1;
            this._value |= (1 << SRBit.ZERO);
        }

        this.publishWriteBit(this.index, SRBit.ZERO, this._zero);

    }

    get zero(): number {

        this.publishReadBit(this.index, SRBit.ZERO, this._zero);
        return this._zero;
    }

    set carry(newValue: number) {

        if (newValue === 0) {
            this._carry = 0;
            this._value &= ~(1 << SRBit.CARRY);
        } else {
            this._carry = 1;
            this._value |= (1 << SRBit.CARRY);
        }

        this.publishWriteBit(this.index, SRBit.CARRY, this._carry);

    }

    get carry(): number {

        this.publishReadBit(this.index, SRBit.CARRY, this._carry);
        return this._carry;
    }

    set irqMask(newValue: number) {

        if (newValue === 0) {
            this._irqMask = 0;
            this._value &= ~(1 << SRBit.IRQMASK);
        } else {
            this._irqMask = 1;
            this._value |= (1 << SRBit.IRQMASK);
        }

        this.publishWriteBit(this.index, SRBit.IRQMASK, this._irqMask);

    }

    get irqMask(): number {

        this.publishReadBit(this.index, SRBit.IRQMASK, this._irqMask);
        return this._irqMask;
    }

    set supervisor(newValue: number) {

        if (newValue === 0) {
            this._supervisor = 0;
            this._value &= ~(1 << SRBit.SUPERVISOR);
        } else {
            this._supervisor = 1;
            this._value |= (1 << SRBit.SUPERVISOR);
        }

        this.publishWriteBit(this.index, SRBit.SUPERVISOR, this._supervisor);

    }

    get supervisor(): number {

        this.publishReadBit(this.index, SRBit.SUPERVISOR, this._supervisor);
        return this._supervisor;
    }

}
