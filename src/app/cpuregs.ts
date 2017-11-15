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
    IP = 5,
    SR = 6,
    AH = 10,
    AL = 11,
    BH = 12,
    BL = 13,
    CH = 14,
    CL = 15,
    DH = 16,
    DL = 17

}

export function getRegisterSize(index: CPURegisterIndex): number {

    let size: number;

    switch (index) {

        case CPURegisterIndex.A:
        case CPURegisterIndex.B:
        case CPURegisterIndex.C:
        case CPURegisterIndex.D:
        case CPURegisterIndex.SP:
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
    PUSH_WORD = 3, /* Stack pointer specific operation: push 2 bytes to stack */
    PUSH_BYTE = 4, /* Stack pointer specific operation: push 1 byte to stack */
    POP_WORD = 5, /* Stack pointer specific operation: pop 2 bytes from stack */
    POP_BYTE = 6 /* Stack pointer specific operation: pop 2 bytes from stack */

}

export class CPURegisterOperation {

    public operationType: CPURegisterOperationType;
    public index: number;
    public value: number;

    constructor(operationType: CPURegisterOperationType, index: number, value: number) {

        this.operationType = operationType;
        this.index = index;
        this.value = value;

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

    protected pushWriteValue(newValue: number) {

        if (this.operationSource) {

            this.operationSource.next(new CPURegisterOperation(CPURegisterOperationType.WRITE,
                this.index, newValue));

        }

    }

    protected pushReadValue() {

        if (this.operationSource) {

            this.operationSource.next(new CPURegisterOperation(CPURegisterOperationType.READ,
                this.index, this._value));

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
        this.pushWriteValue(this._value);

    }

    get lsb() {

        this.pushReadValue();

        return (this._value & 0x00FF);

    }

    set msb(newValue: number) {

        this._value = (this._value & 0x00FF) + (newValue << 8);
        this.pushWriteValue(this._value);

    }

    get msb() {

        this.pushReadValue();

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

            this.operationSource.next(new CPURegisterOperation(CPURegisterOperationType.PUSH_WORD,
                this.index, this._value));

        }

    }

    public popWord() {

        this._value = this._value + 2;

        if (this.operationSource) {

            this.operationSource.next(new CPURegisterOperation(CPURegisterOperationType.POP_WORD,
                this.index, this._value));

        }

    }

    public pushByte() {

        this._value = this._value - 1;

        if (this.operationSource) {

            this.operationSource.next(new CPURegisterOperation(CPURegisterOperationType.PUSH_BYTE,
                this.index, this._value));

        }

    }

    public popByte() {

        this._value = this._value + 1;

        if (this.operationSource) {

            this.operationSource.next(new CPURegisterOperation(CPURegisterOperationType.POP_BYTE,
                this.index, this._value));

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

        this.pushWriteValue(this._value);

    }

    get halt(): number {

        this.pushReadValue();
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

        this.pushWriteValue(this._value);

    }

    get fault(): number {

        this.pushReadValue();
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

        this.pushWriteValue(this._value);

    }

    get zero(): number {

        this.pushReadValue();
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

        this.pushWriteValue(this._value);

    }

    get carry(): number {

        this.pushReadValue();
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

        this.pushWriteValue(this._value);

    }

    get irqMask(): number {

        this.pushReadValue();
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

        this.pushWriteValue(this._value);

    }

    get supervisor(): number {

        this.pushReadValue();
        return this._supervisor;
    }


}
