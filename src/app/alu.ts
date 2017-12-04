import { CPUStackPointerRegister, CPUStatusRegister, CPURegister,
    CPURegisterIndex  } from './cpuregs';

export enum ALUErrorType {

    DIVISION_BY_ZERO = 0

}

export class ALUError {

    public message: string;
    public type: ALUErrorType;

    constructor(type: ALUErrorType, message: string) {

        this.type = type;
        this.message = message;

    }

}

export enum ALUOperationType {

    ADD = 0,
    ADDB = 1,
    SUB = 2,
    SUBB = 3,
    MUL = 4,
    MULB = 5,
    DIV = 6,
    DIVB = 7,
    AND = 8,
    ANDB = 9,
    OR = 10,
    ORB = 11,
    XOR = 12,
    XORB = 13,
    NOT = 14,
    NOTB = 15,
    SHL = 16,
    SHLB = 17,
    SHR = 18,
    SHRB = 19

}

export interface ALUOperationParamsAddition {

    summand1: number;
    summand2: number;
    result: number;
    carryFlag: number;
    zeroFlag: number;

}

export interface ALUOperationParamsSubstraction {

    minuend: number;
    subtrahend: number;
    result: number;
    carryFlag: number;
    zeroFlag: number;

}

export interface ALUOperationParamsMultiplication {

    multiplicand: number;
    multiplier: number;
    result: number;
    carryFlag: number;
    zeroFlag: number;

}

export interface ALUOperationParamsDivision {

    dividend: number;
    divisor: number;
    result: number;
    carryFlag: number;
    zeroFlag: number;

}

export interface ALUOperationParamsBitwiseOp {

    operand1: number;
    operand2: number;
    result: number;
    carryFlag: number;
    zeroFlag: number;

}

export interface ALUOperationParamsBitwiseNegation {

    operand: number;
    result: number;
    carryFlag: number;
    zeroFlag: number;

}

export interface ALUOperationParamsBitshiftOp {

    operand: number;
    places: number;
    result: number;
    carryFlag: number;
    zeroFlag: number;

}

export class ALUOperation {

    public operationType: ALUOperationType;
    public data: any;

    constructor(operationType: ALUOperationType, data: any) {

        this.operationType = operationType;
        this.data = data;

    }

}

type PublishALUOperation = (operation: ALUOperation) => void;

interface ALUOperationCheck {

    result: number;
    carryFlag: number;
    zeroFlag: number;

}

export class ArithmeticLogicUnit {

    protected publishALUOperation: PublishALUOperation;
    protected SR: CPUStatusRegister;

    protected static check8bitsOperation(value: number): ALUOperationCheck {

        let carry, zero;

        if (value >= 256) {
            carry = 1;
            value = value % 256;
        } else if (value < 0) {
            carry = 1;
            value = 256 - (-value) % 256;
        } else {
            carry = 0;
        }

        if (value === 0) {
            zero = 1;
        } else {
            zero = 0;
        }

        return { result: value, carryFlag: carry, zeroFlag: zero };

    }

    protected static check16bitsOperation(value: number): ALUOperationCheck {

        let carry, zero;

        if (value >= 65536) {
            carry = 1;
            value = value % 65536;
        } else if (value < 0) {
            carry = 1;
            value = 65536 - (-value) % 65536;
        } else {
            carry = 0;
        }

        if (value === 0) {
            zero = 1;
        } else {
            zero = 0;
        }

        return { result: value, carryFlag: carry, zeroFlag: zero };

    }

    constructor (SR: CPUStatusRegister, publishALUOperation?: PublishALUOperation) {

        this.SR = SR;
        this.publishALUOperation = publishALUOperation;

    }

    protected publishAddition(operationType: ALUOperationType,
                                       summand1: number, summand2: number,
                                       result: number, carryFlag: number, zeroFlag: number) {

        if (this.publishALUOperation) {

            const parameters: ALUOperationParamsAddition = {
                summand1: summand1,
                summand2: summand2,
                result: result,
                carryFlag: carryFlag,
                zeroFlag: zeroFlag
            };

            this.publishALUOperation(new ALUOperation(operationType,
                parameters));

        }

    }

    protected publishSubstraction(operationType: ALUOperationType,
                                  minuend: number, subtrahend: number,
                                  result: number, carryFlag: number, zeroFlag: number) {

        if (this.publishALUOperation) {

            const parameters: ALUOperationParamsSubstraction = {
                minuend: minuend,
                subtrahend: subtrahend,
                result: result,
                carryFlag: carryFlag,
                zeroFlag: zeroFlag
            };

            this.publishALUOperation(new ALUOperation(operationType,
                parameters));

        }

    }

    protected publishMultiplication(operationType: ALUOperationType,
                                    multiplicand: number, multiplier: number,
                                    result: number, carryFlag: number, zeroFlag: number) {

        if (this.publishALUOperation) {

            const parameters: ALUOperationParamsMultiplication = {
                multiplicand: multiplicand,
                multiplier: multiplier,
                result: result,
                carryFlag: carryFlag,
                zeroFlag: zeroFlag
            };

            this.publishALUOperation(new ALUOperation(operationType,
                parameters));
        }

    }

    protected publishDivision(operationType: ALUOperationType,
                              dividend: number, divisor: number,
                              result: number, carryFlag: number, zeroFlag: number) {

        if (this.publishALUOperation) {

            const parameters: ALUOperationParamsDivision = {
                dividend: dividend,
                divisor: divisor,
                result: result,
                carryFlag: carryFlag,
                zeroFlag: zeroFlag
            };

            this.publishALUOperation(new ALUOperation(operationType,
                parameters));
        }

    }

    protected publishBitwiseOp(operationType: ALUOperationType,
                               operand1: number, operand2: number,
                               result: number, carryFlag: number, zeroFlag: number) {

        if (this.publishALUOperation) {

            const parameters: ALUOperationParamsBitwiseOp = {
                operand1: operand1,
                operand2: operand2,
                result: result,
                carryFlag: carryFlag,
                zeroFlag: zeroFlag
            };

            this.publishALUOperation(new ALUOperation(operationType,
                parameters));
        }

    }

    protected publishBitwiseNegation(operationType: ALUOperationType,
                                     operand: number, result: number, carryFlag: number, zeroFlag: number) {

        if (this.publishALUOperation) {

            const parameters: ALUOperationParamsBitwiseNegation = {
                operand: operand,
                result: result,
                carryFlag: carryFlag,
                zeroFlag: zeroFlag
            };

            this.publishALUOperation(new ALUOperation(operationType,
                parameters));
        }

    }

    protected publishBitshiftOp(operationType: ALUOperationType,
                                operand: number, places: number,
                                result: number, carryFlag: number, zeroFlag: number) {

        if (this.publishALUOperation) {

            const parameters: ALUOperationParamsBitshiftOp = {
                operand: operand,
                places: places,
                result: result,
                carryFlag: carryFlag,
                zeroFlag: zeroFlag
            };

            this.publishALUOperation(new ALUOperation(operationType,
                parameters));
        }

    }


    public performAddition16Bits(summand1: number, summand2: number): number {

        const ret = ArithmeticLogicUnit.check16bitsOperation(summand1 + summand2);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        this.publishAddition(ALUOperationType.ADD,
            summand1, summand2, ret.result, ret.carryFlag, ret.zeroFlag);

        return ret.result;

    }

    public performAddition8Bits(summand1: number, summand2: number): number {

        const ret = ArithmeticLogicUnit.check8bitsOperation(summand1 + summand2);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        this.publishAddition(ALUOperationType.ADDB,
            summand1, summand2, ret.result, ret.carryFlag, ret.zeroFlag);

        return ret.result;

    }

    public performSubstraction16Bits(minuend: number, subtrahend: number): number {

        const ret = ArithmeticLogicUnit.check16bitsOperation(minuend - subtrahend);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        this.publishSubstraction(ALUOperationType.SUB,
            minuend, subtrahend, ret.result, ret.carryFlag, ret.zeroFlag);

        return ret.result;

    }

    public performSubstraction8Bits(minuend: number, subtrahend: number): number {

        const ret = ArithmeticLogicUnit.check8bitsOperation(minuend - subtrahend);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        this.publishSubstraction(ALUOperationType.ADDB,
            minuend, subtrahend, ret.result, ret.carryFlag, ret.zeroFlag);

        return ret.result;

    }

    public performMultiplication16Bits(multiplicand: number, multiplier: number): number {

        const ret = ArithmeticLogicUnit.check16bitsOperation(multiplicand * multiplier);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        this.publishMultiplication(ALUOperationType.MUL,
            multiplicand, multiplier, ret.result, ret.carryFlag, ret.zeroFlag);

        return ret.result;

    }

    public performMultiplication8Bits(multiplicand: number, multiplier: number): number {

        const ret = ArithmeticLogicUnit.check8bitsOperation(multiplicand * multiplier);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        this.publishMultiplication(ALUOperationType.MULB,
            multiplicand, multiplier, ret.result, ret.carryFlag, ret.zeroFlag);

        return ret.result;

    }

    public performDivision16Bits(dividend: number, divisor: number): number {

        if (divisor === 0) {
            throw new ALUError(ALUErrorType.DIVISION_BY_ZERO,
                `Divide by zero error`);
        }

        const ret = ArithmeticLogicUnit.check16bitsOperation(Math.floor(dividend / divisor));

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        this.publishDivision(ALUOperationType.DIV,
            dividend, divisor, ret.result, ret.carryFlag, ret.zeroFlag);

        return ret.result;

    }

    public performDivision8Bits(dividend: number, divisor: number): number {

        if (divisor === 0) {
            throw new ALUError(ALUErrorType.DIVISION_BY_ZERO,
                `Divide by zero error`);
        }

        const ret = ArithmeticLogicUnit.check8bitsOperation(Math.floor(dividend / divisor));

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        this.publishDivision(ALUOperationType.DIVB,
            dividend, divisor, ret.result, ret.carryFlag, ret.zeroFlag);

        return ret.result;

    }

    public performBitwiseAND16Bits(operand1: number, operand2: number): number {

        const ret = ArithmeticLogicUnit.check16bitsOperation(operand1 & operand2);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        this.publishBitwiseOp(ALUOperationType.AND,
            operand1, operand2, ret.result, ret.carryFlag, ret.zeroFlag);

        return ret.result;

    }

    public performBitwiseAND8Bits(operand1: number, operand2: number): number {

        const ret = ArithmeticLogicUnit.check8bitsOperation(operand1 & operand2);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        this.publishBitwiseOp(ALUOperationType.ORB,
            operand1, operand2, ret.result, ret.carryFlag, ret.zeroFlag);

        return ret.result;

    }

    public performBitwiseOR16Bits(operand1: number, operand2: number): number {

        const ret = ArithmeticLogicUnit.check16bitsOperation(operand1 | operand2);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        this.publishBitwiseOp(ALUOperationType.OR,
            operand1, operand2, ret.result, ret.carryFlag, ret.zeroFlag);

        return ret.result;

    }

    public performBitwiseOR8Bits(operand1: number, operand2: number): number {

        const ret = ArithmeticLogicUnit.check8bitsOperation(operand1 | operand2);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        this.publishBitwiseOp(ALUOperationType.ORB,
            operand1, operand2, ret.result, ret.carryFlag, ret.zeroFlag);

        return ret.result;

    }

    public performBitwiseXOR16Bits(operand1: number, operand2: number): number {

        const ret = ArithmeticLogicUnit.check16bitsOperation(operand1 ^ operand2);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        this.publishBitwiseOp(ALUOperationType.XOR,
            operand1, operand2, ret.result, ret.carryFlag, ret.zeroFlag);

        return ret.result;

    }

    public performBitwiseXOR8Bits(operand1: number, operand2: number): number {

        const ret = ArithmeticLogicUnit.check8bitsOperation(operand1 ^ operand2);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        this.publishBitwiseOp(ALUOperationType.XORB,
            operand1, operand2, ret.result, ret.carryFlag, ret.zeroFlag);

        return ret.result;

    }

    public performBitwiseNOT16Bits(operand: number): number {

        const ret = ArithmeticLogicUnit.check16bitsOperation(~operand);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        this.publishBitwiseNegation(ALUOperationType.NOT,
            operand, ret.result, ret.carryFlag, ret.zeroFlag);

        return ret.result;

    }

    public performBitwiseNOT8Bits(operand: number): number {

        const ret = ArithmeticLogicUnit.check8bitsOperation(~operand);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        this.publishBitwiseNegation(ALUOperationType.NOTB,
            operand, ret.result, ret.carryFlag, ret.zeroFlag);

        return ret.result;

    }

    public performBitshiftLeft16Bits(operand: number, places: number): number {

        const ret = ArithmeticLogicUnit.check16bitsOperation(operand << places);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        this.publishBitshiftOp(ALUOperationType.SHL,
            operand, places, ret.result, ret.carryFlag, ret.zeroFlag);

        return ret.result;

    }

    public performBitshiftLeft8Bits(operand: number, places: number): number {

        const ret = ArithmeticLogicUnit.check8bitsOperation(operand << places);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        this.publishBitshiftOp(ALUOperationType.SHLB,
            operand, places, ret.result, ret.carryFlag, ret.zeroFlag);

        return ret.result;

    }

    public performBitshiftRight16Bits(operand: number, places: number): number {

        const ret = ArithmeticLogicUnit.check16bitsOperation(operand >>> places);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        this.publishBitshiftOp(ALUOperationType.SHR,
            operand, places, ret.result, ret.carryFlag, ret.zeroFlag);

        return ret.result;

    }

    public performBitshiftRight8Bits(operand: number, places: number): number {

        const ret = ArithmeticLogicUnit.check8bitsOperation(operand >>> places);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        this.publishBitshiftOp(ALUOperationType.SHRB,
            operand, places, ret.result, ret.carryFlag, ret.zeroFlag);

        return ret.result;

    }

}
