import { CPUStatusRegister } from './cpuregs';

import { Utils } from './utils';
import { SystemEvent } from './events-log.service';

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

export class ALUOperation implements SystemEvent {

    public operationType: ALUOperationType;
    public data: any;

    constructor(operationType: ALUOperationType, data: any) {

        this.operationType = operationType;
        this.data = data;

    }

    toString(): string {

        let ret, params;

        switch (this.operationType) {
            case ALUOperationType.ADD:
                params = <ALUOperationParamsAddition>this.data;
                ret = `ALU: 16-bits addition (0x${Utils.pad(params.summand1, 16, 4)} + ` +
                      `0x${Utils.pad(params.summand2, 16, 4)}) = ` +
                      `0x${Utils.pad(params.result, 16, 4)}, C = ${params.carryFlag}, Z = ${params.zeroFlag}`;
                break;
            case ALUOperationType.ADDB:
                params = <ALUOperationParamsAddition>this.data;
                ret = `ALU: 8-bits addition (0x${Utils.pad(params.summand1, 16, 2)} + ` +
                      `0x${Utils.pad(params.summand2, 16, 2)}) = ` +
                      `0x${Utils.pad(params.result, 16, 2)}, C = ${params.carryFlag}, Z = ${params.zeroFlag}`;
                break;
            case ALUOperationType.SUB:
                params = <ALUOperationParamsSubstraction>this.data;
                ret = `ALU: 16-bits substraction (0x${Utils.pad(params.minuend, 16, 4)} - ` +
                      `0x${Utils.pad(params.subtrahend, 16, 4)}) = ` +
                      `0x${Utils.pad(params.result, 16, 4)}, C = ${params.carryFlag}, Z = ${params.zeroFlag}`;
                break;
            case ALUOperationType.SUBB:
                params = <ALUOperationParamsSubstraction>this.data;
                ret = `ALU: 8-bits substraction (0x${Utils.pad(params.minuend, 16, 2)} - ` +
                      `0x${Utils.pad(params.subtrahend, 16, 2)}) = ` +
                      `0x${Utils.pad(params.result, 16, 4)}, C = ${params.carryFlag}, Z = ${params.zeroFlag}`;
                break;
            case ALUOperationType.MUL:
                params = <ALUOperationParamsMultiplication>this.data;
                ret = `ALU: 16-bits multiplication (0x${Utils.pad(params.multiplicand, 16, 4)} * ` +
                      `0x${Utils.pad(params.multiplier, 16, 4)}) = ` +
                      `0x${Utils.pad(params.result, 16, 4)}, C = ${params.carryFlag}, Z = ${params.zeroFlag}`;
                break;
            case ALUOperationType.MULB:
                params = <ALUOperationParamsMultiplication>this.data;
                ret = `ALU: 8-bits multiplication (0x${Utils.pad(params.multiplicand, 16, 2)} * ` +
                      `0x${Utils.pad(params.multiplier, 16, 2)}) = ` +
                      `0x${Utils.pad(params.result, 16, 2)}, C = ${params.carryFlag}, Z = ${params.zeroFlag}`;
                break;
            case ALUOperationType.DIV:
                params = <ALUOperationParamsDivision>this.data;
                ret = `ALU: 16-bits integer division (0x${Utils.pad(params.dividend, 16, 4)} * ` +
                      `0x${Utils.pad(params.divisor, 16, 4)}) = ` +
                      `0x${Utils.pad(params.result, 16, 4)}, C = ${params.carryFlag}, Z = ${params.zeroFlag}`;
                break;
            case ALUOperationType.DIVB:
                params = <ALUOperationParamsDivision>this.data;
                ret = `ALU: 8-bits integer division (0x${Utils.pad(params.dividend, 16, 2)} * ` +
                      `0x${Utils.pad(params.divisor, 16, 2)}) = ` +
                      `0x${Utils.pad(params.result, 16, 2)}, C = ${params.carryFlag}, Z = ${params.zeroFlag}`;
                break;
            case ALUOperationType.AND:
                params = <ALUOperationParamsBitwiseOp>this.data;
                ret = `ALU: 16-bits bitwise AND (0x${Utils.pad(params.operand1, 16, 4)} & ` +
                      `0x${Utils.pad(params.operand2, 16, 4)}) = ` +
                      `0x${Utils.pad(params.result, 16, 4)}, C = ${params.carryFlag}, Z = ${params.zeroFlag}`;
                break;
            case ALUOperationType.ANDB:
                params = <ALUOperationParamsBitwiseOp>this.data;
                ret = `ALU: 8-bits bitwise AND (0x${Utils.pad(params.operand1, 16, 2)} & ` +
                      `0x${Utils.pad(params.operand2, 16, 2)}) = ` +
                      `0x${Utils.pad(params.result, 16, 2)}, C = ${params.carryFlag}, Z = ${params.zeroFlag}`;
                break;
            case ALUOperationType.OR:
                params = <ALUOperationParamsBitwiseOp>this.data;
                ret = `ALU: 16-bits bitwise OR (0x${Utils.pad(params.operand1, 16, 4)} | ` +
                      `0x${Utils.pad(params.operand2, 16, 4)}) = ` +
                      `0x${Utils.pad(params.result, 16, 4)}, C = ${params.carryFlag}, Z = ${params.zeroFlag}`;
                break;
            case ALUOperationType.ORB:
                params = <ALUOperationParamsBitwiseOp>this.data;
                ret = `ALU: 8-bits bitwise OR (0x${Utils.pad(params.operand1, 16, 2)} | ` +
                      `0x${Utils.pad(params.operand2, 16, 2)}) = ` +
                      `0x${Utils.pad(params.result, 16, 2)}, C = ${params.carryFlag}, Z = ${params.zeroFlag}`;
                break;
            case ALUOperationType.XOR:
                params = <ALUOperationParamsBitwiseOp>this.data;
                ret = `ALU: 16-bits bitwise XOR (0x${Utils.pad(params.operand1, 16, 4)} ^ ` +
                      `0x${Utils.pad(params.operand2, 16, 4)}) = ` +
                      `0x${Utils.pad(params.result, 16, 4)}, C = ${params.carryFlag}, Z = ${params.zeroFlag}`;
                break;
            case ALUOperationType.XORB:
                params = <ALUOperationParamsBitwiseOp>this.data;
                ret = `ALU: 8-bits bitwise XOR (0x${Utils.pad(params.operand1, 16, 2)} ^ ` +
                      `0x${Utils.pad(params.operand2, 16, 2)}) = ` +
                      `0x${Utils.pad(params.result, 16, 2)}, C = ${params.carryFlag}, Z = ${params.zeroFlag}`;
                break;
            case ALUOperationType.NOT:
                params = <ALUOperationParamsBitwiseNegation>this.data;
                ret = `ALU: 16-bits bitwise NOT (~0x${Utils.pad(params.operand, 16, 4)}) = ` +
                      `0x${Utils.pad(params.result, 16, 4)}, C = ` +
                      `${params.carryFlag}, Z = ${params.zeroFlag}`;
                break;
            case ALUOperationType.NOTB:
                params = <ALUOperationParamsBitwiseNegation>this.data;
                ret = `ALU: 8-bits bitwise NOT (~0x${Utils.pad(params.operand, 16, 2)}) = ` +
                      `0x${Utils.pad(params.result, 16, 2)}, C = ` +
                      `${params.carryFlag}, Z = ${params.zeroFlag}`;
                break;
            case ALUOperationType.SHL:
                params = <ALUOperationParamsBitshiftOp>this.data;
                ret = `ALU: 16-bits bitshift left (0x${Utils.pad(params.operand, 16, 4)} << ` +
                      `0x${Utils.pad(params.places, 16, 4)}) = ` +
                      `0x${Utils.pad(params.result, 16, 4)}, C = ${params.carryFlag}, Z = ${params.zeroFlag}`;
                break;
            case ALUOperationType.SHLB:
                params = <ALUOperationParamsBitshiftOp>this.data;
                ret = `ALU: 8-bits bitshift left (0x${Utils.pad(params.operand, 16, 2)} << ` +
                      `0x${Utils.pad(params.places, 16, 2)}) = ` +
                      `0x${Utils.pad(params.result, 16, 2)}, C = ${params.carryFlag}, Z = ${params.zeroFlag}`;
                break;
            case ALUOperationType.SHR:
                params = <ALUOperationParamsBitshiftOp>this.data;
                ret = `ALU: 16-bits bitshift right (0x${Utils.pad(params.operand, 16, 4)} >> ` +
                      `0x${Utils.pad(params.places, 16, 4)}) = ` +
                      `0x${Utils.pad(params.result, 16, 4)}, C = ${params.carryFlag}, Z = ${params.zeroFlag}`;
                break;
            case ALUOperationType.SHRB:
                params = <ALUOperationParamsBitshiftOp>this.data;
                ret = `ALU: 8-bits bitshift right (0x${Utils.pad(params.operand, 16, 2)} >> ` +
                      `0x${Utils.pad(params.places, 16, 2)}) = ` +
                      `0x${Utils.pad(params.result, 16, 2)}, C = ${params.carryFlag}, Z = ${params.zeroFlag}`;
                break;
            default:
                break;
        }

        return ret;

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

        this.publishAddition(ALUOperationType.ADD,
            summand1, summand2, ret.result, ret.carryFlag, ret.zeroFlag);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        return ret.result;

    }

    public performAddition8Bits(summand1: number, summand2: number): number {

        const ret = ArithmeticLogicUnit.check8bitsOperation(summand1 + summand2);

        this.publishAddition(ALUOperationType.ADDB,
            summand1, summand2, ret.result, ret.carryFlag, ret.zeroFlag);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        return ret.result;

    }

    public performSubstraction16Bits(minuend: number, subtrahend: number): number {

        const ret = ArithmeticLogicUnit.check16bitsOperation(minuend - subtrahend);

        this.publishSubstraction(ALUOperationType.SUB,
            minuend, subtrahend, ret.result, ret.carryFlag, ret.zeroFlag);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        return ret.result;

    }

    public performSubstraction8Bits(minuend: number, subtrahend: number): number {

        const ret = ArithmeticLogicUnit.check8bitsOperation(minuend - subtrahend);

        this.publishSubstraction(ALUOperationType.SUBB,
            minuend, subtrahend, ret.result, ret.carryFlag, ret.zeroFlag);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        return ret.result;

    }

    public performMultiplication16Bits(multiplicand: number, multiplier: number): number {

        const ret = ArithmeticLogicUnit.check16bitsOperation(multiplicand * multiplier);

        this.publishMultiplication(ALUOperationType.MUL,
            multiplicand, multiplier, ret.result, ret.carryFlag, ret.zeroFlag);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        return ret.result;

    }

    public performMultiplication8Bits(multiplicand: number, multiplier: number): number {

        const ret = ArithmeticLogicUnit.check8bitsOperation(multiplicand * multiplier);

        this.publishMultiplication(ALUOperationType.MULB,
            multiplicand, multiplier, ret.result, ret.carryFlag, ret.zeroFlag);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        return ret.result;

    }

    public performDivision16Bits(dividend: number, divisor: number): number {

        if (divisor === 0) {
            throw new ALUError(ALUErrorType.DIVISION_BY_ZERO,
                `Divide by zero error`);
        }

        const ret = ArithmeticLogicUnit.check16bitsOperation(Math.floor(dividend / divisor));

        this.publishDivision(ALUOperationType.DIV,
            dividend, divisor, ret.result, ret.carryFlag, ret.zeroFlag);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        return ret.result;

    }

    public performDivision8Bits(dividend: number, divisor: number): number {

        if (divisor === 0) {
            throw new ALUError(ALUErrorType.DIVISION_BY_ZERO,
                `Divide by zero error`);
        }

        const ret = ArithmeticLogicUnit.check8bitsOperation(Math.floor(dividend / divisor));

        this.publishDivision(ALUOperationType.DIVB,
            dividend, divisor, ret.result, ret.carryFlag, ret.zeroFlag);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        return ret.result;

    }

    public performBitwiseAND16Bits(operand1: number, operand2: number): number {

        const ret = ArithmeticLogicUnit.check16bitsOperation(operand1 & operand2);

        this.publishBitwiseOp(ALUOperationType.AND,
            operand1, operand2, ret.result, ret.carryFlag, ret.zeroFlag);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        return ret.result;

    }

    public performBitwiseAND8Bits(operand1: number, operand2: number): number {

        const ret = ArithmeticLogicUnit.check8bitsOperation(operand1 & operand2);

        this.publishBitwiseOp(ALUOperationType.ORB,
            operand1, operand2, ret.result, ret.carryFlag, ret.zeroFlag);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        return ret.result;

    }

    public performBitwiseOR16Bits(operand1: number, operand2: number): number {

        const ret = ArithmeticLogicUnit.check16bitsOperation(operand1 | operand2);

        this.publishBitwiseOp(ALUOperationType.OR,
            operand1, operand2, ret.result, ret.carryFlag, ret.zeroFlag);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        return ret.result;

    }

    public performBitwiseOR8Bits(operand1: number, operand2: number): number {

        const ret = ArithmeticLogicUnit.check8bitsOperation(operand1 | operand2);

        this.publishBitwiseOp(ALUOperationType.ORB,
            operand1, operand2, ret.result, ret.carryFlag, ret.zeroFlag);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        return ret.result;

    }

    public performBitwiseXOR16Bits(operand1: number, operand2: number): number {

        const ret = ArithmeticLogicUnit.check16bitsOperation(operand1 ^ operand2);

        this.publishBitwiseOp(ALUOperationType.XOR,
            operand1, operand2, ret.result, ret.carryFlag, ret.zeroFlag);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        return ret.result;

    }

    public performBitwiseXOR8Bits(operand1: number, operand2: number): number {

        const ret = ArithmeticLogicUnit.check8bitsOperation(operand1 ^ operand2);

        this.publishBitwiseOp(ALUOperationType.XORB,
            operand1, operand2, ret.result, ret.carryFlag, ret.zeroFlag);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        return ret.result;

    }

    public performBitwiseNOT16Bits(operand: number): number {

        const ret = ArithmeticLogicUnit.check16bitsOperation(~operand);

        this.publishBitwiseNegation(ALUOperationType.NOT,
            operand, ret.result, ret.carryFlag, ret.zeroFlag);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        return ret.result;

    }

    public performBitwiseNOT8Bits(operand: number): number {

        const ret = ArithmeticLogicUnit.check8bitsOperation(~operand);

        this.publishBitwiseNegation(ALUOperationType.NOTB,
            operand, ret.result, ret.carryFlag, ret.zeroFlag);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        return ret.result;

    }

    public performBitshiftLeft16Bits(operand: number, places: number): number {

        const ret = ArithmeticLogicUnit.check16bitsOperation(operand << places);

        this.publishBitshiftOp(ALUOperationType.SHL,
            operand, places, ret.result, ret.carryFlag, ret.zeroFlag);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        return ret.result;

    }

    public performBitshiftLeft8Bits(operand: number, places: number): number {

        const ret = ArithmeticLogicUnit.check8bitsOperation(operand << places);

        this.publishBitshiftOp(ALUOperationType.SHLB,
            operand, places, ret.result, ret.carryFlag, ret.zeroFlag);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        return ret.result;

    }

    public performBitshiftRight16Bits(operand: number, places: number): number {

        const ret = ArithmeticLogicUnit.check16bitsOperation(operand >>> places);

        this.publishBitshiftOp(ALUOperationType.SHR,
            operand, places, ret.result, ret.carryFlag, ret.zeroFlag);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        return ret.result;

    }

    public performBitshiftRight8Bits(operand: number, places: number): number {

        const ret = ArithmeticLogicUnit.check8bitsOperation(operand >>> places);

        this.publishBitshiftOp(ALUOperationType.SHRB,
            operand, places, ret.result, ret.carryFlag, ret.zeroFlag);

        this.SR.carry = ret.carryFlag;
        this.SR.zero = ret.zeroFlag;

        return ret.result;

    }

}
