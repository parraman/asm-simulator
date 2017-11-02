import { Injectable } from '@angular/core';

import { isNumeric } from 'rxjs/util/isNumeric';

export enum OPCODES {

    NONE = 0,
    MOV_REG_TO_REG = 1,
    MOV_ADDRESS_TO_REG = 2,
    MOV_REGADDRESS_TO_REG = 3,
    MOV_REG_TO_ADDRESS = 4,
    MOV_REG_TO_REGADDRESS = 5,
    MOV_NUMBER_TO_REG = 6,
    MOV_NUMBER_TO_ADDRESS = 7,
    MOV_NUMBER_TO_REGADDRESS = 8,
    ADD_REG_TO_REG = 10,
    ADD_REGADDRESS_TO_REG = 11,
    ADD_ADDRESS_TO_REG = 12,
    ADD_NUMBER_TO_REG = 13,
    SUB_REG_FROM_REG = 14,
    SUB_REGADDRESS_FROM_REG = 15,
    SUB_ADDRESS_FROM_REG = 16,
    SUB_NUMBER_FROM_REG = 17,
    INC_REG = 18,
    DEC_REG = 19,
    CMP_REG_WITH_REG = 20,
    CMP_REGADDRESS_WITH_REG = 21,
    CMP_ADDRESS_WITH_REG = 22,
    CMP_NUMBER_WITH_REG = 23,
    JMP_REGADDRESS = 30,
    JMP_ADDRESS = 31,
    JC_REGADDRESS = 32,
    JC_ADDRESS = 33,
    JNC_REGADDRESS = 34,
    JNC_ADDRESS = 35,
    JZ_REGADDRESS = 36,
    JZ_ADDRESS = 37,
    JNZ_REGADDRESS = 38,
    JNZ_ADDRESS = 39,
    JA_REGADDRESS = 40,
    JA_ADDRESS = 41,
    JNA_REGADDRESS = 42,
    JNA_ADDRESS = 43,
    PUSH_REG = 50,
    PUSH_REGADDRESS = 51,
    PUSH_ADDRESS = 52,
    PUSH_NUMBER = 53,
    POP_REG = 54,
    CALL_REGADDRESS = 55,
    CALL_ADDRESS = 56,
    RET = 57,
    MUL_REG = 60,
    MUL_REGADDRESS = 61,
    MUL_ADDRESS = 62,
    MUL_NUMBER = 63,
    DIV_REG = 64,
    DIV_REGADDRESS = 65,
    DIV_ADDRESS = 66,
    DIV_NUMBER = 67,
    AND_REG_WITH_REG = 70,
    AND_REGADDRESS_WITH_REG = 71,
    AND_ADDRESS_WITH_REG = 72,
    AND_NUMBER_WITH_REG = 73,
    OR_REG_WITH_REG = 74,
    OR_REGADDRESS_WITH_REG = 75,
    OR_ADDRESS_WITH_REG = 76,
    OR_NUMBER_WITH_REG = 77,
    XOR_REG_WITH_REG = 78,
    XOR_REGADDRESS_WITH_REG = 79,
    XOR_ADDRESS_WITH_REG = 80,
    XOR_NUMBER_WITH_REG = 81,
    NOT_REG = 82,
    SHL_REG_WITH_REG = 90,
    SHL_REGADDRESS_WITH_REG = 91,
    SHL_ADDRESS_WITH_REG = 92,
    SHL_NUMBER_WITH_REG = 93,
    SHR_REG_WITH_REG = 94,
    SHR_REGADDRESS_WITH_REG = 95,
    SHR_ADDRESS_WITH_REG = 96,
    SHR_NUMBER_WITH_REG = 97

}

const REGEX = /^[\t ]*(?:([.A-Za-z]\w*)[:])?(?:[\t ]*([A-Za-z]{2,4})(?:[\t ]+(\[(\w+((\+|-)\d+)?)\]|\".+?\"|\'.+?\'|[.A-Za-z0-9]\w*)(?:[\t ]*[,][\t ]*(\[(\w+((\+|-)\d+)?)\]|\".+?\"|\'.+?\'|[.A-Za-z0-9]\w*))?)?)?/;
const OP1_GROUP = 3;
const OP2_GROUP = 7;

// MATCHES: "(+|-)INTEGER"
const REGEX_NUM = /^[-+]?[0-9]+$/;
// MATCHES: "(.L)abel"
const REGEX_LABEL = /^[.A-Za-z]\w*$/;

@Injectable()
export class AssemblerService {

    private code: Array<number> = [];
    private mapping: Map<number, number> = new Map<number, number>();
    private labels: Map<string, number> = new Map<string, number>();
    private normalizedLabels: Array<string> = [];

    // Allowed formats: 200, 200d, 0xA4, 0o48, 101b
    private static parseNumber(input: string): number {
        if (input.slice(0, 2) === '0x') {
            return parseInt(input.slice(2), 16);
        } else if (input.slice(0, 2) === '0o') {
            return parseInt(input.slice(2), 8);
        } else if (input.slice(input.length - 1) === 'b') {
            return parseInt(input.slice(0, input.length - 1), 2);
        } else if (input.slice(input.length - 1) === 'd') {
            return parseInt(input.slice(0, input.length - 1), 10);
        } else if (REGEX_NUM.exec(input)) {
            return parseInt(input, 10);
        } else {
            throw Error('Invalid number format');
        }
    }

    // Allowed registers: A, B, C, D, SP, SR
    private static parseRegister(input: string): number | undefined {

        input = input.toUpperCase();

        if (input === 'A') {
            return 0;
        } else if (input === 'B') {
            return 1;
        } else if (input === 'C') {
            return 2;
        } else if (input === 'D') {
            return 3;
        } else if (input === 'SP') {
            return 4;
        } else if (input === 'SR') {
            return 5;
        } else {
            return undefined;
        }

    }

    private static parseOffsetAddressing(input: string): number | undefined {

        input = input.toUpperCase();

        let m = 0;
        let base = 0;

        if (input[0] === 'A') {
            base = 0;
        } else if (input[0] === 'B') {
            base = 1;
        } else if (input[0] === 'C') {
            base = 2;
        } else if (input[0] === 'D') {
            base = 3;
        } else if (input.slice(0, 2) === 'SP') {
            base = 4;
        } else {
            return undefined;
        }

        let offset_start = 1;

        if (base === 4) {
            offset_start = 2;
        }

        if (input[offset_start] === '-') {
            m = -1;
        } else if (input[offset_start] === '+') {
            m = 1;
        } else {
            return undefined;
        }

        let offset = m * parseInt(input.slice(offset_start + 1), 10);

        if (offset < -16 || offset > 15) {
            throw Error('offset must be a value between -16...+15');
        }

        if (offset < 0) {
            offset = 32 + offset; // two's complement representation in 5-bit
        }

        return offset * 8 + base; // shift offset 3 bits right and add code for register
    }

    // Allowed: Register, Label or Number; SP+/-Number is allowed for 'regaddress' type
    private static parseRegOrNumber(input: string, typeReg: string, typeNumber: string) {

        let register = AssemblerService.parseRegister(input);

        if (register !== undefined) {
            return {type: typeReg, value: register};
        } else {

            const label = AssemblerService.parseLabel(input);

            if (label !== undefined) {
                return {type: typeNumber, value: label};
            } else {
                if (typeReg === 'regaddress') {

                    register = AssemblerService.parseOffsetAddressing(input);

                    if (register !== undefined) {
                        return {type: typeReg, value: register};
                    }
                }

                const value = AssemblerService.parseNumber(input);

                if (isNaN(value)) {
                    throw Error(`Not a ${typeNumber}: ${value}`);
                } else if (value < 0 || value > 255) {
                    throw Error(`${typeNumber} must have a value between 0-255`);
                }

                return {type: typeNumber, value: value};
            }
        }
    }

    private static parseLabel(input: string): string | undefined {

        return REGEX_LABEL.exec(input) ? input : undefined;

    }

    private static getValue(input: string) {

        switch (input.slice(0, 1)) {

            case '[': // [number] or [register]

                const address = input.slice(1, input.length - 1);
                return AssemblerService.parseRegOrNumber(address, 'regaddress', 'address');

            case '"': // "String"

                const text = input.slice(1, input.length - 1);
                const chars = [];

                for (let i = 0, l = text.length; i < l; i++) {
                    chars.push(text.charCodeAt(i));
                }

                return {type: 'numbers', value: chars};

            case '\'': // 'C'

                const character = input.slice(1, input.length - 1);
                if (character.length > 1) {

                    throw Error('Only one character is allowed. Use String instead');

                }

                return {type: 'number', value: character.charCodeAt(0)};

            default: // REGISTER, NUMBER or LABEL

                return AssemblerService.parseRegOrNumber(input, 'register', 'number');
        }

    }

    private static checkNoExtraArg(instr: string, arg: string) {
        if (arg !== undefined) {
            throw Error(`${instr}: too many arguments`);
        }
    }

    private addLabel(label: string) {

        const upperLabel = label.toUpperCase();

        if (upperLabel in this.normalizedLabels) {
            throw Error(`Duplicated label: ${label}`);
        }

        if (upperLabel === 'A' || upperLabel === 'B' || upperLabel === 'C' || upperLabel === 'D') {
            throw Error(`Label contains keyword: ${upperLabel}`);
        }

        this.labels.set(label, this.code.length);
    }


    constructor() {
    }

    public go(input: string): { code: Array<number>, mapping: Map<number, number>, labels: Map<string, number> } {

        const lines = input.split('\n');

        for (let i = 0, l = lines.length; i < l; i++) {

            const match = REGEX.exec(lines[i]);

            if (match[1] !== undefined || match[2] !== undefined) {
                if (match[1] !== undefined) {
                    this.addLabel(match[1]);
                }

                if (match[2] !== undefined) {

                    const instr = match[2].toUpperCase();
                    let p1, p2, opCode;

                    // Add mapping instr pos to line number
                    // Don't do it for DB as this is not a real instruction
                    if (instr !== 'DB') {
                        this.mapping.set(this.code.length, i);
                    }

                    switch (instr) {
                        case 'DB':

                            p1 = AssemblerService.getValue(match[OP1_GROUP]);

                            if (p1.type === 'number') {
                                this.code.push(p1.value);
                            } else if (p1.type === 'numbers') {
                                for (let j = 0, k = p1.value.length; j < k; j++) {
                                    this.code.push(p1.value[j]);
                                }
                            } else {
                                throw Error('DB does not support this operand');
                            }

                            break;

                        case 'HLT':

                            AssemblerService.checkNoExtraArg('HLT', match[OP1_GROUP]);
                            opCode = OPCODES.NONE;
                            this.code.push(opCode);
                            break;

                        case 'MOV':
                            p1 = AssemblerService.getValue(match[OP1_GROUP]);
                            p2 = AssemblerService.getValue(match[OP2_GROUP]);

                            if (p1.type === 'register' && p2.type === 'register') {
                                opCode = OPCODES.MOV_REG_TO_REG;
                            } else if (p1.type === 'register' && p2.type === 'address') {
                                opCode = OPCODES.MOV_ADDRESS_TO_REG;
                            } else if (p1.type === 'register' && p2.type === 'regaddress') {
                                opCode = OPCODES.MOV_REGADDRESS_TO_REG;
                            } else if (p1.type === 'address' && p2.type === 'register') {
                                opCode = OPCODES.MOV_REG_TO_ADDRESS;
                            } else if (p1.type === 'regaddress' && p2.type === 'register') {
                                opCode = OPCODES.MOV_REG_TO_REGADDRESS;
                            } else if (p1.type === 'register' && p2.type === 'number') {
                                opCode = OPCODES.MOV_NUMBER_TO_REG;
                            } else if (p1.type === 'address' && p2.type === 'number') {
                                opCode = OPCODES.MOV_NUMBER_TO_ADDRESS;
                            } else if (p1.type === 'regaddress' && p2.type === 'number') {
                                opCode = OPCODES.MOV_NUMBER_TO_REGADDRESS;
                            } else {
                                throw Error('MOV does not support these operands');
                            }

                            this.code.push(opCode, p1.value, p2.value);
                            break;
                        case 'ADD':
                            p1 = AssemblerService.getValue(match[OP1_GROUP]);
                            p2 = AssemblerService.getValue(match[OP2_GROUP]);

                            if (p1.type === 'register' && p2.type === 'register') {
                                opCode = OPCODES.ADD_REG_TO_REG;
                            } else if (p1.type === 'register' && p2.type === 'regaddress') {
                                opCode = OPCODES.ADD_REGADDRESS_TO_REG;
                            } else if (p1.type === 'register' && p2.type === 'address') {
                                opCode = OPCODES.ADD_ADDRESS_TO_REG;
                            } else if (p1.type === 'register' && p2.type === 'number') {
                                opCode = OPCODES.ADD_NUMBER_TO_REG;
                            } else {
                                throw Error('ADD does not support this operands');
                            }

                            this.code.push(opCode, p1.value, p2.value);
                            break;
                        case 'SUB':
                            p1 = AssemblerService.getValue(match[OP1_GROUP]);
                            p2 = AssemblerService.getValue(match[OP2_GROUP]);

                            if (p1.type === 'register' && p2.type === 'register') {
                                opCode = OPCODES.SUB_REG_FROM_REG;
                            } else if (p1.type === 'register' && p2.type === 'regaddress') {
                                opCode = OPCODES.SUB_REGADDRESS_FROM_REG;
                            } else if (p1.type === 'register' && p2.type === 'address') {
                                opCode = OPCODES.SUB_ADDRESS_FROM_REG;
                            } else if (p1.type === 'register' && p2.type === 'number') {
                                opCode = OPCODES.SUB_NUMBER_FROM_REG;
                            } else {
                                throw Error('SUB does not support this operands');
                            }

                            this.code.push(opCode, p1.value, p2.value);
                            break;
                        case 'INC':
                            p1 = AssemblerService.getValue(match[OP1_GROUP]);
                            AssemblerService.checkNoExtraArg('INC', match[OP2_GROUP]);

                            if (p1.type === 'register') {
                                opCode = OPCODES.INC_REG;
                            } else {
                                throw Error('INC does not support this operand');
                            }

                            this.code.push(opCode, p1.value);

                            break;
                        case 'DEC':
                            p1 = AssemblerService.getValue(match[OP1_GROUP]);
                            AssemblerService.checkNoExtraArg('DEC', match[OP2_GROUP]);

                            if (p1.type === 'register') {
                                opCode = OPCODES.DEC_REG;
                            } else {
                                throw {error: 'DEC does not support this operand', line: i};
                            }

                            this.code.push(opCode, p1.value);

                            break;
                        case 'CMP':
                            p1 = AssemblerService.getValue(match[OP1_GROUP]);
                            p2 = AssemblerService.getValue(match[OP2_GROUP]);

                            if (p1.type === 'register' && p2.type === 'register') {
                                opCode = OPCODES.CMP_REG_WITH_REG;
                            } else if (p1.type === 'register' && p2.type === 'regaddress') {
                                opCode = OPCODES.CMP_REGADDRESS_WITH_REG;
                            } else if (p1.type === 'register' && p2.type === 'address') {
                                opCode = OPCODES.CMP_ADDRESS_WITH_REG;
                            } else if (p1.type === 'register' && p2.type === 'number') {
                                opCode = OPCODES.CMP_NUMBER_WITH_REG;
                            } else {
                                throw {error: 'CMP does not support this operands', line: i};
                            }

                            this.code.push(opCode, p1.value, p2.value);
                            break;
                        case 'JMP':
                            p1 = AssemblerService.getValue(match[OP1_GROUP]);
                            AssemblerService.checkNoExtraArg('JMP', match[OP2_GROUP]);

                            if (p1.type === 'register') {
                                opCode = OPCODES.JMP_REGADDRESS;
                            } else if (p1.type === 'number') {
                                opCode = OPCODES.JMP_ADDRESS;
                            } else {
                                throw {error: 'JMP does not support this operands', line: i};
                            }

                            this.code.push(opCode, p1.value);
                            break;
                        case 'JC':
                        case 'JB':
                        case 'JNAE':
                            p1 = AssemblerService.getValue(match[OP1_GROUP]);
                            AssemblerService.checkNoExtraArg(instr, match[OP2_GROUP]);

                            if (p1.type === 'register') {
                                opCode = OPCODES.JC_REGADDRESS;
                            } else if (p1.type === 'number') {
                                opCode = OPCODES.JC_ADDRESS;
                            } else {
                                throw {error: instr + ' does not support this operand', line: i};
                            }

                            this.code.push(opCode, p1.value);
                            break;
                        case 'JNC':
                        case 'JNB':
                        case 'JAE':
                            p1 = AssemblerService.getValue(match[OP1_GROUP]);
                            AssemblerService.checkNoExtraArg(instr, match[OP2_GROUP]);

                            if (p1.type === 'register') {
                                opCode = OPCODES.JNC_REGADDRESS;
                            } else if (p1.type === 'number') {
                                opCode = OPCODES.JNC_ADDRESS;
                            } else {
                                throw {error: instr + 'does not support this operand', line: i};
                            }

                            this.code.push(opCode, p1.value);
                            break;
                        case 'JZ':
                        case 'JE':
                            p1 = AssemblerService.getValue(match[OP1_GROUP]);
                            AssemblerService.checkNoExtraArg(instr, match[OP2_GROUP]);

                            if (p1.type === 'register') {
                                opCode = OPCODES.JZ_REGADDRESS;
                            } else if (p1.type === 'number') {
                                opCode = OPCODES.JZ_ADDRESS;
                            } else {
                                throw {error: instr + ' does not support this operand', line: i};
                            }

                            this.code.push(opCode, p1.value);
                            break;
                        case 'JNZ':
                        case 'JNE':
                            p1 = AssemblerService.getValue(match[OP1_GROUP]);
                            AssemblerService.checkNoExtraArg(instr, match[OP2_GROUP]);

                            if (p1.type === 'register') {
                                opCode = OPCODES.JNZ_REGADDRESS;
                            } else if (p1.type === 'number') {
                                opCode = OPCODES.JNZ_ADDRESS;
                            } else {
                                throw {error: instr + ' does not support this operand', line: i};
                            }

                            this.code.push(opCode, p1.value);
                            break;
                        case 'JA':
                        case 'JNBE':
                            p1 = AssemblerService.getValue(match[OP1_GROUP]);
                            AssemblerService.checkNoExtraArg(instr, match[OP2_GROUP]);

                            if (p1.type === 'register') {
                                opCode = OPCODES.JA_REGADDRESS;
                            } else if (p1.type === 'number') {
                                opCode = OPCODES.JA_ADDRESS;
                            } else {
                                throw {error: instr + ' does not support this operand', line: i};
                            }

                            this.code.push(opCode, p1.value);
                            break;
                        case 'JNA':
                        case 'JBE':
                            p1 = AssemblerService.getValue(match[OP1_GROUP]);
                            AssemblerService.checkNoExtraArg(instr, match[OP2_GROUP]);

                            if (p1.type === 'register') {
                                opCode = OPCODES.JNA_REGADDRESS;
                            } else if (p1.type === 'number') {
                                opCode = OPCODES.JNA_ADDRESS;
                            } else {
                                throw {error: instr + ' does not support this operand', line: i};
                            }

                            this.code.push(opCode, p1.value);
                            break;
                        case 'PUSH':
                            p1 = AssemblerService.getValue(match[OP1_GROUP]);
                            AssemblerService.checkNoExtraArg(instr, match[OP2_GROUP]);

                            if (p1.type === 'register') {
                                opCode = OPCODES.PUSH_REG;
                            } else if (p1.type === 'regaddress') {
                                opCode = OPCODES.PUSH_REGADDRESS;
                            } else if (p1.type === 'address') {
                                opCode = OPCODES.PUSH_ADDRESS;
                            } else if (p1.type === 'number') {
                                opCode = OPCODES.PUSH_NUMBER;
                            } else {
                                throw {error: 'PUSH does not support this operand', line: i};
                            }

                            this.code.push(opCode, p1.value);
                            break;
                        case 'POP':
                            p1 = AssemblerService.getValue(match[OP1_GROUP]);
                            AssemblerService.checkNoExtraArg(instr, match[OP2_GROUP]);

                            if (p1.type === 'register') {
                                opCode = OPCODES.POP_REG;
                            } else {
                                throw {error: 'PUSH does not support this operand', line: i};
                            }

                            this.code.push(opCode, p1.value);
                            break;
                        case 'CALL':
                            p1 = AssemblerService.getValue(match[OP1_GROUP]);
                            AssemblerService.checkNoExtraArg(instr, match[OP2_GROUP]);

                            if (p1.type === 'register') {
                                opCode = OPCODES.CALL_REGADDRESS;
                            } else if (p1.type === 'number') {
                                opCode = OPCODES.CALL_ADDRESS;
                            } else {
                                throw {error: 'CALL does not support this operand', line: i};
                            }

                            this.code.push(opCode, p1.value);
                            break;
                        case 'RET':
                            AssemblerService.checkNoExtraArg(instr, match[OP1_GROUP]);

                            opCode = OPCODES.RET;

                            this.code.push(opCode);

                            break;

                        case 'MUL':
                            p1 = AssemblerService.getValue(match[OP1_GROUP]);
                            AssemblerService.checkNoExtraArg(instr, match[OP2_GROUP]);

                            if (p1.type === 'register') {
                                opCode = OPCODES.MUL_REG;
                            } else if (p1.type === 'regaddress') {
                                opCode = OPCODES.MUL_REGADDRESS;
                            } else if (p1.type === 'address') {
                                opCode = OPCODES.MUL_ADDRESS;
                            } else if (p1.type === 'number') {
                                opCode = OPCODES.MUL_NUMBER;
                            } else {
                                throw {error: 'MULL does not support this operand', line: i};
                            }

                            this.code.push(opCode, p1.value);
                            break;
                        case 'DIV':
                            p1 = AssemblerService.getValue(match[OP1_GROUP]);
                            AssemblerService.checkNoExtraArg(instr, match[OP2_GROUP]);

                            if (p1.type === 'register') {
                                opCode = OPCODES.DIV_REG;
                            } else if (p1.type === 'regaddress') {
                                opCode = OPCODES.DIV_REGADDRESS;
                            } else if (p1.type === 'address') {
                                opCode = OPCODES.DIV_ADDRESS;
                            } else if (p1.type === 'number') {
                                opCode = OPCODES.DIV_NUMBER;
                            } else {
                                throw {error: 'DIV does not support this operand', line: i};
                            }

                            this.code.push(opCode, p1.value);
                            break;
                        case 'AND':
                            p1 = AssemblerService.getValue(match[OP1_GROUP]);
                            p2 = AssemblerService.getValue(match[OP2_GROUP]);

                            if (p1.type === 'register' && p2.type === 'register') {
                                opCode = OPCODES.AND_REG_WITH_REG;
                            } else if (p1.type === 'register' && p2.type === 'regaddress') {
                                opCode = OPCODES.AND_REGADDRESS_WITH_REG;
                            } else if (p1.type === 'register' && p2.type === 'address') {
                                opCode = OPCODES.AND_ADDRESS_WITH_REG;
                            } else if (p1.type === 'register' && p2.type === 'number') {
                                opCode = OPCODES.AND_NUMBER_WITH_REG;
                            } else {
                                throw {error: 'AND does not support this operands', line: i};
                            }

                            this.code.push(opCode, p1.value, p2.value);
                            break;
                        case 'OR':
                            p1 = AssemblerService.getValue(match[OP1_GROUP]);
                            p2 = AssemblerService.getValue(match[OP2_GROUP]);

                            if (p1.type === 'register' && p2.type === 'register') {
                                opCode = OPCODES.OR_REG_WITH_REG;
                            } else if (p1.type === 'register' && p2.type === 'regaddress') {
                                opCode = OPCODES.OR_REGADDRESS_WITH_REG;
                            } else if (p1.type === 'register' && p2.type === 'address') {
                                opCode = OPCODES.OR_ADDRESS_WITH_REG;
                            } else if (p1.type === 'register' && p2.type === 'number') {
                                opCode = OPCODES.OR_NUMBER_WITH_REG;
                            } else {
                                throw {error: 'OR does not support this operands', line: i};
                            }

                            this.code.push(opCode, p1.value, p2.value);
                            break;
                        case 'XOR':
                            p1 = AssemblerService.getValue(match[OP1_GROUP]);
                            p2 = AssemblerService.getValue(match[OP2_GROUP]);

                            if (p1.type === 'register' && p2.type === 'register') {
                                opCode = OPCODES.XOR_REG_WITH_REG;
                            } else if (p1.type === 'register' && p2.type === 'regaddress') {
                                opCode = OPCODES.XOR_REGADDRESS_WITH_REG;
                            } else if (p1.type === 'register' && p2.type === 'address') {
                                opCode = OPCODES.XOR_ADDRESS_WITH_REG;
                            } else if (p1.type === 'register' && p2.type === 'number') {
                                opCode = OPCODES.XOR_NUMBER_WITH_REG;
                            } else {
                                throw {error: 'XOR does not support this operands', line: i};
                            }

                            this.code.push(opCode, p1.value, p2.value);
                            break;
                        case 'NOT':
                            p1 = AssemblerService.getValue(match[OP1_GROUP]);
                            AssemblerService.checkNoExtraArg(instr, match[OP2_GROUP]);

                            if (p1.type === 'register') {
                                opCode = OPCODES.NOT_REG;
                            } else {
                                throw {error: 'NOT does not support this operand', line: i};
                            }

                            this.code.push(opCode, p1.value);
                            break;
                        case 'SHL':
                        case 'SAL':
                            p1 = AssemblerService.getValue(match[OP1_GROUP]);
                            p2 = AssemblerService.getValue(match[OP2_GROUP]);

                            if (p1.type === 'register' && p2.type === 'register') {
                                opCode = OPCODES.SHL_REG_WITH_REG;
                            } else if (p1.type === 'register' && p2.type === 'regaddress') {
                                opCode = OPCODES.SHL_REGADDRESS_WITH_REG;
                            } else if (p1.type === 'register' && p2.type === 'address') {
                                opCode = OPCODES.SHL_ADDRESS_WITH_REG;
                            } else if (p1.type === 'register' && p2.type === 'number') {
                                opCode = OPCODES.SHL_NUMBER_WITH_REG;
                            } else {
                                throw {error: `${instr} does not support this operands`, line: i};
                            }

                            this.code.push(opCode, p1.value, p2.value);
                            break;
                        case 'SHR':
                        case 'SAR':
                            p1 = AssemblerService.getValue(match[OP1_GROUP]);
                            p2 = AssemblerService.getValue(match[OP2_GROUP]);

                            if (p1.type === 'register' && p2.type === 'register') {
                                opCode = OPCODES.SHR_REG_WITH_REG;
                            } else if (p1.type === 'register' && p2.type === 'regaddress') {
                                opCode = OPCODES.SHR_REGADDRESS_WITH_REG;
                            } else if (p1.type === 'register' && p2.type === 'address') {
                                opCode = OPCODES.SHR_ADDRESS_WITH_REG;
                            } else if (p1.type === 'register' && p2.type === 'number') {
                                opCode = OPCODES.SHR_NUMBER_WITH_REG;
                            } else {
                                throw {error: instr + ' does not support this operands', line: i};
                            }

                            this.code.push(opCode, p1.value, p2.value);
                            break;
                        default:
                            throw {error: `Invalid instruction: ${match[2]}`, line: i};
                    }
                }
            } else {
                // Check if line starts with a comment otherwise the line contains an error and can not be parsed
                const line = lines[i].trim();
                if (line !== '' && line.slice(0, 1) !== ';') {
                    throw {error: 'Syntax error', line: i};
                }
            }

        }

        // Replace labels
        for (let i = 0, l = this.code.length; i < l; i++) {
            if (isNumeric(this.code[i]) === false) {
                if (this.labels.has(this.code[i].toString())) {
                    this.code[i] = this.labels.get(this.code[i].toString());
                } else {

                    throw {error: `Undefined label: ${this.code[i]}`};
                }
            }
        }

        return {code: this.code, mapping: this.mapping, labels: this.labels};

    }
}
