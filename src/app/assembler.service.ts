import {Injectable} from '@angular/core';

import { isNumeric } from 'rxjs/internal/util/isNumeric';
import { OperandType, instructionSet } from './instrset';
import { CPURegisterIndex, getRegisterSize } from './cpuregs';

/**
 * This regular expression is used to parse the lines of code. The original
 * expression was defined by Marco Schweighauser. This version includes the
 * capability of using escape characters (e.g. \t \x12 \n) within the
 * definition of a string.
 */
//const REGEX = /^[\t ]*(?:([.A-Za-z]\w*)[:])?(?:[\t ]*([A-Za-z]{2,5})(?:[\t ]+(\[(\w+((\+|-)\d+)?)\]|\"(?:[^\\"]|\\.)+?\"|\'.+?\'|[.A-Za-z0-9]\w*)(?:[\t ]*[,][\t ]*(\[([\t ]*\w+[\t ]*((\+|-)[\t ]*\d+)?[\t ]*)\]|\"(?:[^\\"]|\\.)+?\"|\'.+?\'|[.A-Za-z0-9]\w*))?)?)?/;
const REGEX = /^[\t ]*(?:([.A-Za-z]\w+)[:])?(?:(?:([.A-Za-z]\w+)[\t ]+(EQU)[\t ]+(\[([\t ]*\w+[\t ]*((\+|-)[\t ]*\d+)?[\t ]*)\]|\"(?:[^\\"]|\\.)+?\"|\'.+?\'|[.A-Za-z0-9]\w*))|(?:[\t ]*([A-Za-z]{2,5})(?:[\t ]+(\[(\w+((\+|-)\d+)?)\]|\"(?:[^\\"]|\\.)+?\"|\'.+?\'|[.A-Za-z0-9]\w*)(?:[\t ]*[,][\t ]*(\[([\t ]*\w+[\t ]*((\+|-)[\t ]*\d+)?[\t ]*)\]|\"(?:[^\\"]|\\.)+?\"|\'.+?\'|[.A-Za-z0-9]\w*))?)?))?/; 

const LABEL_GROUP = 1;

const EQU_LABEL_GROUP = 2;
const EQU_KEY_GROUP = 3;
const EQU_VALUE_GROUP = 4;

const INSTR_GROUP = 8;
const OP1_GROUP = 9;
const OP2_GROUP = 13;

// MATCHES: "(+|-)DECIMAL"
const REGEX_DECIMAL = /^[-+]?[0-9]+$/;

// MATCHES: "HEXADECIMAL"
const REGEX_HEXADECIMAL = /^[0-9A-Fa-f]+$/;

// MATCHES: "OCTAL"
const REGEX_OCTAL = /^[0-7]+$/;

// MATCHES: "BINARY"
const REGEX_BINARY = /^[0-1]+$/;

// MATCHES: "(.L)abel"
const REGEX_LABEL = /^[.A-Za-z]\w*$/;

@Injectable()
export class AssemblerService {

    private code: Array<number>;
    private mapping: Map<number, number>;
    private labels: Map<string, number>;
    private equs: Map<string, string>;

    // Allowed formats: 200, 200d, 0xA4, 0o48, 101b
    private static parseNumber(input: string): number {

        if (input.slice(0, 2) === '0x') {
            if (REGEX_HEXADECIMAL.test(input.slice(2)) === true) {
                return parseInt(input.slice(2), 16);
            } else {
                throw Error(`Invalid hexadecimal number: ${input}`);
            }
        } else if (input.slice(0, 2) === '0o') {
            if (REGEX_OCTAL.test(input.slice(2)) === true) {
                return parseInt(input.slice(2), 8);
            } else {
                throw Error(`Invalid octal number: ${input}`);
            }
        } else if (input.slice(input.length - 1) === 'b') {
            if (REGEX_BINARY.test(input.slice(0, input.length - 1)) === true) {
                return parseInt(input.slice(0, input.length - 1), 2);
            } else {
                throw Error(`Invalid binary number: ${input}`);
            }
        } else if (input.slice(input.length - 1) === 'd') {
            if (REGEX_DECIMAL.test(input.slice(0, input.length - 1)) === true) {
                return parseInt(input.slice(0, input.length - 1), 10);
            } else {
                throw Error(`Invalid decimal number: ${input}`);
            }
        } else if (REGEX_DECIMAL.test(input)) {
            return parseInt(input, 10);
        } else {
            throw Error(`Invalid number format: ${input}`);
        }

    }

    // Allowed registers: A, B, C, D, SP
    private static parseRegister(input: string): number | undefined {

        if (input === 'A') {
            return CPURegisterIndex.A;
        } else if (input === 'B') {
            return CPURegisterIndex.B;
        } else if (input === 'C') {
            return CPURegisterIndex.C;
        } else if (input === 'D') {
            return CPURegisterIndex.D;
        } else if (input === 'SP') {
            return CPURegisterIndex.SP;
        } else if (input === 'AH') {
            return CPURegisterIndex.AH;
        } else if (input === 'AL') {
            return CPURegisterIndex.AL;
        } else if (input === 'BH') {
            return CPURegisterIndex.BH;
        } else if (input === 'BL') {
            return CPURegisterIndex.BL;
        } else if (input === 'CH') {
            return CPURegisterIndex.CH;
        } else if (input === 'CL') {
            return CPURegisterIndex.CL;
        } else if (input === 'DH') {
            return CPURegisterIndex.DH;
        } else if (input === 'DL') {
            return CPURegisterIndex.DL;
        } else {
            return undefined;
        }

    }

    private static parseOffsetAddressing(input: string): number | undefined {

        let m = 0;
        let base = 0;

        if (input[0] === 'A') {
            base = CPURegisterIndex.A;
        } else if (input[0] === 'B') {
            base = CPURegisterIndex.B;
        } else if (input[0] === 'C') {
            base = CPURegisterIndex.C;
        } else if (input[0] === 'D') {
            base = CPURegisterIndex.D;
        } else if (input.slice(0, 2) === 'SP') {
            base = CPURegisterIndex.SP;
        } else {
            return undefined;
        }

        let offset_start = 1;

        if (base === CPURegisterIndex.SP) {
            offset_start = 2;
        }

        if (input.length === offset_start) {
            return base;
        }

        let offsetString = input.slice(offset_start).trim();

        if (offsetString[0] === '-') {
            m = -1;
        } else if (offsetString[0] === '+') {
            m = 1;
        } else {
            return undefined;
        }

        let offset = m * parseInt(offsetString.slice(1).trim(), 10);

        if (offset < -128 || offset > 127) {
            throw Error('offset must be a value between -128...+127');
        }

        if (offset < 0) {
            offset = 256 + offset; // two's complement representation in 8-bit
        }

        return (offset << 8) + base; // shift offset 8 bits right and add code for register
    }

    // Allowed: Register addressing, Label or Number
    private static parseAddressItem(input: string) {

        // First we check if it is a register addressing
        const register = AssemblerService.parseOffsetAddressing(input.trim());

        if (register !== undefined) {
            return {type: OperandType.REGADDRESS, value: register};
        }

        const label = AssemblerService.parseLabel(input.trim());

        if (label !== undefined) {
            return {type: OperandType.ADDRESS, value: label};
        }

        const value = AssemblerService.parseNumber(input.trim());

        if (isNaN(value)) {
            throw Error(`Not a number nor a valid register addressing: ${value}`);
        }

        return {type: OperandType.ADDRESS, value: value};

    }

    // Allowed: Register, Label or Number
    private parseNumericItem(input: string) {

        const register = AssemblerService.parseRegister(input);

        if (register !== undefined) {
            return {type: OperandType.REGISTER, value: register};
        }

        const label = AssemblerService.parseLabel(input);

        if (label !== undefined) {

            return {type: OperandType.NUMBER, value: label};

        }

        const value = AssemblerService.parseNumber(input);

        if (isNaN(value)) {
            throw Error(`Not a number nor a valid register: ${value}`);
        }

        return {type: OperandType.NUMBER, value: value};
    }

    private static parseLabel(input: string): string | undefined {

        return REGEX_LABEL.exec(input) ? input : undefined;

    }

    private static checkOperandTypeValue(operandType: OperandType, value: number): OperandType {

        switch (operandType) {

            case OperandType.WORD:
                if (isNumeric(value) && (value < 0 || value > 65535)) {
                    throw Error('Operand must have a value between 0-65536');
                }
                break;
            case OperandType.BYTE:
                if (isNumeric(value)) {
                    if (value < 0 || value > 255) {
                        throw Error('Operand must have a value between 0-255');
                    }
                } else {
                    throw Error('Operand must have a value between 0-255');
                }
                break;
            case OperandType.REGISTER_8BITS:
                if (getRegisterSize(value) !== 8) {
                    throw Error('Invalid register. Instruction requires an 8-bit register operand');
                }
                break;
            case OperandType.REGISTER_16BITS:
                if (getRegisterSize(value) !== 16) {
                    throw Error('Invalid register. Instruction requires a 16-bit register operand');
                }
                break;
        }

        return operandType;

    }

    private getValue(input: string) {

        switch (input.slice(0, 1)) {

            case '[': // [number] or [register]

                let address = input.slice(1, input.length - 1);
                if (this.equs.has(address.trim())) {
                    address = this.equs.get(address.trim()); 
                }
                return AssemblerService.parseAddressItem(address);

            case '"': // "String"

                const text = input.slice(1, input.length - 1)
                    .replace(/\\n/, '\n')
                    .replace(/\\t/, '\t')
                    .replace(/\\r/, '\r')
                    .replace(/\\b/, '\b')
                    .replace(/\\'/, '\'')
                    .replace(/\\"/, '\"')
                    .replace(/\\x([0-9a-fA-F]{2})/g, (m: string, c: string) => {
                        return String.fromCharCode(parseInt(c, 16));
                    });
                const chars = [];

                for (let i = 0, l = text.length; i < l; i++) {
                    chars.push(text.charCodeAt(i));
                }

                return {type: OperandType.ARRAY, value: chars};

            case '\'': // 'C'

                const character = input.slice(1, input.length - 1);
                if (character.length > 1) {

                    throw Error('Only one character is allowed. Use a string instead');

                }

                return {type: OperandType.BYTE, value: character.charCodeAt(0)};

            default: // REGISTER, NUMBER, LABEL or EQU

                return this.parseNumericItem(input);
        }

    }

    private addEQU(equ: string, input: string) {

        if (this.equs.has(equ)) {
            throw Error(`Duplicated equ: ${equ}`);
        }

        if (this.labels.has(equ)) {
            throw Error(`A label has been defined with the same name: ${equ}`);
        }

        if (equ === 'A' || equ === 'B' || equ === 'C' || equ === 'D' ||
            equ === 'AH' || equ === 'AL' || equ === 'BH' || equ === 'BL' ||
            equ === 'CH' || equ === 'CL' || equ === 'DH' || equ === 'DL' ||
            equ === 'SP' || equ === 'SR' || equ === 'EQU') {
            throw Error(`EQU contains keyword: ${equ}`);
        }

        this.equs.set(equ, input);
    }

    private addLabel(label: string) {

        if (this.labels.has(label)) {
            throw Error(`Duplicated label: ${label}`);
        }

        if (this.equs.has(label)) {
            throw Error(`An EQU has been defined with the same name: ${label}`);
        }

        if (label === 'A' || label === 'B' || label === 'C' || label === 'D' ||
            label === 'AH' || label === 'AL' || label === 'BH' || label === 'BL' ||
            label === 'CH' || label === 'CL' || label === 'DH' || label === 'DL' ||
            label === 'SP' || label === 'SR' || label === 'EQU') {
            throw Error(`Label contains keyword: ${label}`);
        }

        this.labels.set(label, this.code.length);
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
            case OperandType.REGISTER_8BITS:
            case OperandType.REGISTER_16BITS:
            case OperandType.BYTE:
                this.code.push(item.value);
                break;
        }

    }

    public go(input: string): { code: Array<number>, mapping: Map<number, number>, labels: Map<string, number> } {

        this.code = [];
        this.mapping = new Map<number, number>();
        this.labels = new Map<string, number>();
        this.equs = new Map<string, string>();

        const lines = input.split('\n');

        for (let i = 0, l = lines.length; i < l; i++) {

            const match = REGEX.exec(lines[i]);

            if (match[LABEL_GROUP] === undefined && match[INSTR_GROUP] === undefined && match[EQU_KEY_GROUP] === undefined) {

                // Check if line starts with a comment otherwise the line contains an error and can not be parsed
                const line = lines[i].trim();
                if (line !== '' && line.slice(0, 1) !== ';') {
                    throw {error: 'Syntax error', line: i + 1};
                }
                continue;
            }

            if (match[LABEL_GROUP] !== undefined) {
                this.addLabel(match[LABEL_GROUP]);
            }

            if (match[EQU_KEY_GROUP] !== undefined) {
                this.addEQU(match[EQU_LABEL_GROUP], match[EQU_VALUE_GROUP]);
            } else if (match[INSTR_GROUP] !== undefined) {

                const instr = match[INSTR_GROUP];
                let p1, p2, instructionSpec;

                // Start parsing instructions (except DB, for it is not a real instruction)

                if (instr === 'DB') {

                    try {
                        let op1 = match[OP1_GROUP];
                        if (this.equs.has(op1.trim())) {
                            op1 = this.equs.get(op1.trim()); 
                        }
                        p1 = this.getValue(op1);
                    } catch (e) {
                        throw {error: e.toString(), line: i + 1};
                    }

                    if (p1.type === OperandType.NUMBER) {
                        p1.type = AssemblerService.checkOperandTypeValue(OperandType.BYTE, p1.value);
                        this.pushOperandToCode(p1);
                    } else if (p1.type === OperandType.ARRAY) {
                        for (let j = 0, k = p1.value.length; j < k; j++) {
                            this.code.push(p1.value[j]);
                        }
                    } else {
                        throw {error: 'DB does not support this operand', line: i + 1};
                    }

                    continue;
                } else if (instr === 'DW') {

                    try {
                        let op1 = match[OP1_GROUP];
                        if (this.equs.has(op1.trim())) {
                            op1 = this.equs.get(op1.trim()); 
                        }
                        p1 = this.getValue(op1);
                    } catch (e) {
                        throw {error: e.toString(), line: i + 1};
                    }

                    if (p1.type === OperandType.NUMBER) {
                        p1.type = AssemblerService.checkOperandTypeValue(OperandType.WORD, p1.value);
                        this.pushOperandToCode(p1);
                    } else {
                        throw {error: 'DW does not support this operand', line: i + 1};
                    }

                    continue;
                } else if (instr === 'ORG') {



                    try {
                        let op1 = match[OP1_GROUP];
                        if (this.equs.has(op1.trim())) {
                            op1 = this.equs.get(op1.trim()); 
                        }
                        p1 = this.getValue(op1);
                    } catch (e) {
                        throw {error: e.toString(), line: i + 1};
                    }

                    if (p1.type === OperandType.NUMBER) {

                        const offset = p1.value - this.code.length;

                        if (offset < 0) {
                            throw {error: 'ORG cannot set an address that already has been superseded', line: i + 1};
                        }

                        this.code = this.code.concat(Array<number>(offset).fill(0));

                    } else {
                        throw {error: 'ORG does not support this operand', line: i + 1};
                    }
                    continue;
                }

                this.mapping.set(this.code.length, i);

                if (match[OP1_GROUP] !== undefined) {

                    try {
                        let op1 = match[OP1_GROUP];
                        if (this.equs.has(op1.trim())) {
                            op1 = this.equs.get(op1.trim()); 
                        }
                        p1 = this.getValue(op1);
                    } catch (e) {
                        throw {error: e.toString(), line: i + 1};
                    }

                    if (match[OP2_GROUP] !== undefined) {

                        try {
                            let op2 = match[OP2_GROUP];
                            if (this.equs.has(op2.trim())) {
                                op2 = this.equs.get(op2.trim()); 
                            }
                            p2 = this.getValue(op2);
                        } catch (e) {
                            throw {error: e.toString(), line: i + 1};
                        }

                    }

                }

                try {
                    instructionSpec = instructionSet.getInstruction(instr, (p1) ? p1.type : undefined,
                        (p2) ? p2.type : undefined);

                    if (p1) {
                        p1.type = AssemblerService.checkOperandTypeValue(instructionSpec.operand1, p1.value);
                    }
                    if (p2) {
                        p2.type = AssemblerService.checkOperandTypeValue(instructionSpec.operand2, p2.value);
                    }
                } catch (e) {
                    throw {error: e.toString(), line: i + 1};
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
                const label = this.code[i].toString();
                if (this.labels.has(label)) {
                    this.storeWordIntoCode(this.labels.get(label), i);
                } else {
                    throw {error: `Undefined label: ${this.code[i]}`};
                }
            }
        }

        return {code: this.code, mapping: this.mapping, labels: this.labels};

    }
}
