import { Subject } from 'rxjs/Subject';

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
    WRITE_BIT = 4,
    READ_LSB = 5,
    WRITE_LSB = 6,
    READ_MSB = 7,
    WRITE_MSB = 8,
    PUSH_WORD = 9, /* Stack pointer specific operation: push 2 bytes to stack */
    PUSH_BYTE = 10, /* Stack pointer specific operation: push 1 byte to stack */
    POP_WORD = 11, /* Stack pointer specific operation: pop 2 bytes from stack */
    POP_BYTE = 12 /* Stack pointer specific operation: pop 2 bytes from stack */

}

export class CPURegisterOperation {

    public operationType: CPURegisterOperationType;
    public data: Map<string, any>;

    constructor(operationType: CPURegisterOperationType, data?: Map<string, any>) {

        this.operationType = operationType;
        this.data = data;

    }

}

export class CPURegister {

    public name: string;
    public description: string;
    public index: number;
    public resetValue: number;

    protected _value: number;

    public operationSource: Subject<CPURegisterOperation>;

    constructor (name: string, index: number, resetValue: number,
                 operationSource?: Subject<CPURegisterOperation>,
                 description?: string) {

        this.name = name;
        this.description = description;
        this.index = index;
        this.resetValue = resetValue;
        this._value = resetValue;
        this.operationSource = operationSource;

    }

    protected pushWriteBit(bitNumber: number, newBitValue: number) {

        if (this.operationSource) {

            const parameters: Map<string, any> = new Map<string, any>();
            parameters.set('index', this.index);
            parameters.set('bitNumber', bitNumber);
            parameters.set('value', newBitValue);

            this.operationSource.next(new CPURegisterOperation(CPURegisterOperationType.WRITE_BIT,
                parameters));

        }

    }

    protected pushReadBit(bitNumber: number) {

        if (this.operationSource) {

            const parameters: Map<string, any> = new Map<string, any>();
            parameters.set('index', this.index);
            parameters.set('bitNumber', bitNumber);
            parameters.set('value', ((this._value & (1 << bitNumber)) !== 0) ? 1 : 0);

            this.operationSource.next(new CPURegisterOperation(CPURegisterOperationType.READ_BIT,
                parameters));

        }

    }

    protected pushWriteValue(newValue: number) {

        if (this.operationSource) {

            const parameters: Map<string, any> = new Map<string, any>();
            parameters.set('index', this.index);
            parameters.set('value', newValue);

            this.operationSource.next(new CPURegisterOperation(CPURegisterOperationType.WRITE,
                parameters));

        }

    }

    protected pushReadValue() {

        if (this.operationSource) {

            const parameters: Map<string, any> = new Map<string, any>();
            parameters.set('index', this.index);
            parameters.set('value', this._value);

            this.operationSource.next(new CPURegisterOperation(CPURegisterOperationType.READ,
                parameters));

        }

    }

    protected pushWriteLSB(newValue: number) {

        if (this.operationSource) {

            const parameters: Map<string, any> = new Map<string, any>();
            parameters.set('index', this.index);
            parameters.set('value', newValue);

            this.operationSource.next(new CPURegisterOperation(CPURegisterOperationType.WRITE_LSB,
                parameters));

        }

    }

    protected pushReadLSB() {

        if (this.operationSource) {

            const parameters: Map<string, any> = new Map<string, any>();
            parameters.set('index', this.index);
            parameters.set('value', (this._value & 0x00FF));

            this.operationSource.next(new CPURegisterOperation(CPURegisterOperationType.READ_LSB,
                parameters));

        }

    }

    protected pushWriteMSB(newValue: number) {

        if (this.operationSource) {

            const parameters: Map<string, any> = new Map<string, any>();
            parameters.set('index', this.index);
            parameters.set('value', newValue);

            this.operationSource.next(new CPURegisterOperation(CPURegisterOperationType.WRITE_MSB,
                parameters));

        }

    }

    protected pushReadMSB() {

        if (this.operationSource) {

            const parameters: Map<string, any> = new Map<string, any>();
            parameters.set('index', this.index);
            parameters.set('value', ((this._value & 0xFF00) >>> 8));

            this.operationSource.next(new CPURegisterOperation(CPURegisterOperationType.READ_MSB,
                parameters));

        }

    }

    get value(): number {

        this.pushReadValue();
        return this._value;

    }

    set value(newValue: number) {

        this._value = newValue;
        this.pushWriteValue(newValue);

    }

}

export class CPUGeneralPurposeRegister extends CPURegister {

    constructor (name: string, index: number, resetValue: number,
                 operationSource?: Subject<CPURegisterOperation>,
                 description?: string) {

        super(name, index, resetValue, operationSource, description);

    }

    set lsb(newValue: number) {

        this._value = (this._value & 0xFF00) + newValue;
        this.pushWriteLSB(newValue);

    }

    get lsb() {

        this.pushReadLSB();

        return (this._value & 0x00FF);

    }

    set msb(newValue: number) {

        this._value = (this._value & 0x00FF) + (newValue << 8);
        this.pushWriteMSB(newValue);

    }

    get msb() {

        this.pushReadMSB();

        return ((this._value & 0xFF00) >>> 8);

    }
}

export class CPUStackPointerRegister extends CPURegister {

    constructor (name: string, index: number, resetValue: number,
                 operationSource?: Subject<CPURegisterOperation>,
                 description?: string) {

        super(name, index, resetValue, operationSource, description);

    }

    public pushWord() {

        this._value = this._value - 2;

        if (this.operationSource) {

            const parameters: Map<string, any> = new Map<string, any>();
            parameters.set('index', this.index);
            parameters.set('value', this._value);

            this.operationSource.next(new CPURegisterOperation(CPURegisterOperationType.PUSH_WORD,
                parameters));

        }

    }

    public popWord() {

        this._value = this._value + 2;

        if (this.operationSource) {

            const parameters: Map<string, any> = new Map<string, any>();
            parameters.set('index', this.index);
            parameters.set('value', this._value);

            this.operationSource.next(new CPURegisterOperation(CPURegisterOperationType.POP_WORD,
                parameters));

        }

    }

    public pushByte() {

        this._value = this._value - 1;

        if (this.operationSource) {

            const parameters: Map<string, any> = new Map<string, any>();
            parameters.set('index', this.index);
            parameters.set('value', this._value);

            this.operationSource.next(new CPURegisterOperation(CPURegisterOperationType.PUSH_BYTE,
                parameters));

        }

    }

    public popByte() {

        this._value = this._value + 1;

        if (this.operationSource) {

            const parameters: Map<string, any> = new Map<string, any>();
            parameters.set('index', this.index);
            parameters.set('value', this._value);

            this.operationSource.next(new CPURegisterOperation(CPURegisterOperationType.POP_BYTE,
                parameters));

        }

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
                 operationSource?: Subject<CPURegisterOperation>,
                 description?: string) {

        super(name, index, initialValue, operationSource, description);

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

        this.pushReadValue();
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
        this.pushWriteValue(newValue);

    }

    set halt(newValue: number) {

        if (newValue === 0) {
            this._halt = 0;
            this._value &= ~(1 << SRBit.HALT);
        } else {
            this._halt = 1;
            this._value |= (1 << SRBit.HALT);
        }

        this.pushWriteBit(SRBit.HALT, this._halt);

    }

    get halt(): number {

        this.pushReadBit(SRBit.HALT);
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

        this.pushWriteBit(SRBit.FAULT, this._fault);

    }

    get fault(): number {

        this.pushReadBit(SRBit.FAULT);
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

        this.pushWriteBit(SRBit.ZERO, this._zero);

    }

    get zero(): number {

        this.pushReadBit(SRBit.ZERO);
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

        this.pushWriteBit(SRBit.CARRY, this._carry);

    }

    get carry(): number {

        this.pushReadBit(SRBit.CARRY);
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

        this.pushWriteBit(SRBit.IRQMASK, this._irqMask);

    }

    get irqMask(): number {

        this.pushReadBit(SRBit.IRQMASK);
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

        this.pushWriteBit(SRBit.SUPERVISOR, this._supervisor);

    }

    get supervisor(): number {

        this.pushReadBit(SRBit.SUPERVISOR);
        return this._supervisor;
    }


}
