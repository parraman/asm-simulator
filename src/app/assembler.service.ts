import {Injectable} from '@angular/core';

import { isNumeric } from 'rxjs/util/isNumeric';
import { OpCode, OperandType, instructionSet } from './instrset';

const REGEX = /^[\t ]*(?:([.A-Za-z]\w*)[:])?(?:[\t ]*([A-Za-z]{2,4})(?:[\t ]+(\[(\w+((\+|-)\d+)?)\]|\".+?\"|\'.+?\'|[.A-Za-z0-9]\w*)(?:[\t ]*[,][\t ]*(\[(\w+((\+|-)\d+)?)\]|\".+?\"|\'.+?\'|[.A-Za-z0-9]\w*))?)?)?/;
const OP1_GROUP = 3;
const OP2_GROUP = 7;

// MATCHES: "(+|-)DECIMAL"
const REGEX_NUM = /^[-+]?[0-9]+$/;
// MATCHES: "(.L)abel"
const REGEX_LABEL = /^[.A-Za-z]\w*$/;

@Injectable()
export class AssemblerService {

    private code: Array<number>;
    private mapping: Map<number, number>;
    private labels: Map<string, number>;

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

    // Allowed registers: A, B, C, D, SP
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

        if (offset < -128 || offset > 127) {
            throw Error('offset must be a value between -128...+127');
        }

        if (offset < 0) {
            offset = 256 + offset; // two's complement representation in 8-bit
        }

        return (offset << 8) + base; // shift offset 8 bits right and add code for register
    }

    // Allowed: Register, Label or Number; SP+/-Number is allowed for 'regaddress' type
    private static parseRegOrNumber(input: string, typeReg: OperandType, typeNumber: OperandType) {

        let register = AssemblerService.parseRegister(input);

        if (register !== undefined) {
            return {type: typeReg, value: register};
        } else {

            const label = AssemblerService.parseLabel(input);

            if (label !== undefined) {
                return {type: typeNumber, value: label};
            } else {
                if (typeReg === OperandType.REGADDRESS) {

                    register = AssemblerService.parseOffsetAddressing(input);

                    if (register !== undefined) {
                        return {type: typeReg, value: register};
                    }
                }

                const value = AssemblerService.parseNumber(input);

                if (isNaN(value)) {
                    throw Error(`Not a number: ${value}`);
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
                return AssemblerService.parseRegOrNumber(address, OperandType.REGADDRESS, OperandType.ADDRESS);

            case '"': // "String"

                const text = input.slice(1, input.length - 1);
                const chars = [];

                for (let i = 0, l = text.length; i < l; i++) {
                    chars.push(text.charCodeAt(i));
                }

                return {type: OperandType.ARRAY, value: chars};

            case '\'': // 'C'

                const character = input.slice(1, input.length - 1);
                if (character.length > 1) {

                    throw Error('Only one character is allowed. Use String instead');

                }

                return {type: OperandType.BYTE, value: character.charCodeAt(0)};

            default: // REGISTER, NUMBER or LABEL

                return AssemblerService.parseRegOrNumber(input, OperandType.REGISTER, OperandType.NUMBER);
        }

    }

    private addLabel(label: string) {

        const upperLabel = label.toUpperCase();

        if (this.labels.has(upperLabel)) {
            throw Error(`Duplicated label: ${label}`);
        }

        if (upperLabel === 'A' || upperLabel === 'B' || upperLabel === 'C' || upperLabel === 'D' ||
            upperLabel === 'SR') {
            throw Error(`Label contains keyword: ${upperLabel}`);
        }

        this.labels.set(upperLabel, this.code.length);
    }

    private storeWordIntoCode(value: number, index: number) {

        const msb = (value & 0xFF00) >>> 8;
        const lsb = (value & 0x00FF);
        this.code[index] = msb;
        this.code[index + 1] = lsb;

    }

    private storeLabelIntoCode(value: number, index: number) {

        this.code[index] = value;
        this.code[index + 1] = 0;

    }


    constructor() {
    }

    private pushOperandToCode(item: {type: OperandType, value: number}) {

        switch (item.type) {
            case OperandType.WORD:
            case OperandType.NUMBER: /* "NUMBER" at this point is a label */
            case OperandType.ADDRESS:
            case OperandType.REGADDRESS:
                /* It can be a number OR a label */
                if (isNumeric(item.value)) {
                    /* It is a number */
                    this.storeWordIntoCode(item.value, this.code.length);
                } else {
                    /* It is a label, we have to let space for the real word */
                    this.storeLabelIntoCode(item.value, this.code.length);
                }
                break;
            case OperandType.REGISTER:
            case OperandType.BYTE:
                this.code.push(item.value);
                break;
        }

    }

    public go(input: string): { code: Array<number>, mapping: Map<number, number>, labels: Map<string, number> } {

        this.code = [];
        this.mapping = new Map<number, number>();
        this.labels = new Map<string, number>();

        const lines = input.split('\n');

        for (let i = 0, l = lines.length; i < l; i++) {

            const match = REGEX.exec(lines[i]);

            if (match[1] === undefined && match[2] === undefined) {

                // Check if line starts with a comment otherwise the line contains an error and can not be parsed
                const line = lines[i].trim();
                if (line !== '' && line.slice(0, 1) !== ';') {
                    throw {error: 'Syntax error', line: i};
                }
                continue;
            }

            if (match[1] !== undefined) {
                this.addLabel(match[1]);
            }

            if (match[2] !== undefined) {

                const instr = match[2].toUpperCase();
                let p1, p2, instructionSpec;

                // Start parsing instructions (except DB, for it is not a real instruction)

                if (instr === 'DB') {

                    p1 = AssemblerService.getValue(match[OP1_GROUP]);

                    if (p1.type === OperandType.NUMBER) {
                        this.code.push(p1.value);
                    } else if (p1.type === OperandType.ARRAY) {
                        for (let j = 0, k = p1.value.length; j < k; j++) {
                            this.code.push(p1.value[j]);
                        }
                    } else {
                        throw {error: 'DB does not support this operand', line: i};
                    }

                    continue;
                }

                this.mapping.set(this.code.length, i);

                if (match[OP1_GROUP] !== undefined) {

                    p1 = AssemblerService.getValue(match[OP1_GROUP]);

                    if (match[OP2_GROUP] !== undefined) {

                        p2 = AssemblerService.getValue(match[OP2_GROUP]);

                    }

                }

                try {
                    instructionSpec = instructionSet.getInstruction(instr, (p1) ? p1.type : undefined,
                        (p2) ? p2.type : undefined);
                } catch (e) {
                    throw {error: e.toString(), line: i};
                }

                if (instructionSpec.operand1 === OperandType.WORD) {

                    if (isNumeric(p1.value) && (p1.value < 0 || p1.value > 65535)) {
                        throw {error: 'Operand must have a value between 0-65536', line: i};
                    }

                    p1.type = OperandType.WORD;

                } else if (instructionSpec.operand1 === OperandType.BYTE) {

                    if (isNumeric(p1.value)) {
                        if (p1.value < 0 || p1.value > 255) {
                            throw {error: 'Operand must have a value between 0-255', line: i};
                        } else {
                            p1.type = OperandType.BYTE;
                        }
                    } else {
                        throw {error: 'Operand must have a value between 0-255', line: i};
                    }

                }

                if (instructionSpec.operand2 === OperandType.WORD) {

                    if (isNumeric(p2.value) && (p2.value < 0 || p2.value > 65535)) {
                        throw {error: 'Operand must have a value between 0-65536', line: i};
                    }

                    p2.type = OperandType.WORD;

                } else if (instructionSpec.operand2 === OperandType.BYTE) {

                    if (isNumeric(p2.value)) {
                        if (p2.value < 0 || p2.value > 255) {
                            throw {error: 'Operand must have a value between 0-255', line: i};
                        } else {
                            p2.type = OperandType.BYTE;
                        }
                    } else {
                        throw {error: 'Operand must have a value between 0-255', line: i};
                    }

                }

                this.code.push(instructionSpec.opcode);

                if (p1) {

                    this.pushOperandToCode(p1);

                }

                if (p2) {

                    this.pushOperandToCode(p2);

                }

            }
        }

        // Replace labels
        for (let i = 0, l = this.code.length; i < l; i++) {
            if (isNumeric(this.code[i]) === false) {
                const upperLabel = this.code[i].toString().toUpperCase();
                if (this.labels.has(upperLabel)) {
                    this.storeWordIntoCode(this.labels.get(upperLabel), i);
                } else {
                    throw {error: `Undefined label: ${this.code[i]}`};
                }
            }
        }

        return {code: this.code, mapping: this.mapping, labels: this.labels};

    }
}
