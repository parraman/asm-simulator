import {} from 'reflect-metadata';


export enum OpCode {

    HLT = 0, /* Halts the CPU */
    MOV_REG16_TO_REG16 = 1,
    MOV_REGADDRESS_TO_REG16 = 2,
    MOV_ADDRESS_TO_REG16 = 3,
    MOV_REG16_TO_REGADDRESS = 4,
    MOV_REG16_TO_ADDRESS = 5,
    MOV_WORD_TO_REG16 = 6,
    MOV_WORD_TO_REGADDRESS = 7,
    MOV_WORD_TO_ADDRESS = 8,
    MOVB_REG8_TO_REG8 = 9,
    MOVB_REGADDRESS_TO_REG8 = 10,
    MOVB_ADDRESS_TO_REG8 = 11,
    MOVB_REG8_TO_REGADDRESS = 12,
    MOVB_REG8_TO_ADDRESS = 13,
    MOVB_BYTE_TO_REG8 = 14,
    MOVB_BYTE_TO_REGADDRESS = 15,
    MOVB_BYTE_TO_ADDRESS = 16,
    ADD_REG16_TO_REG16 = 17,
    ADD_REGADDRESS_TO_REG16 = 18,
    ADD_ADDRESS_TO_REG16 = 19,
    ADD_WORD_TO_REG16 = 20,
    ADDB_REG8_TO_REG8 = 21,
    ADDB_REGADDRESS_TO_REG8 = 22,
    ADDB_ADDRESS_TO_REG8 = 23,
    ADDB_BYTE_TO_REG8 = 24,
    SUB_REG16_FROM_REG16 = 25,
    SUB_REGADDRESS_FROM_REG16 = 26,
    SUB_ADDRESS_FROM_REG16 = 27,
    SUB_WORD_FROM_REG16 = 28,
    SUBB_REG8_FROM_REG8 = 29,
    SUBB_REGADDRESS_FROM_REG8 = 30,
    SUBB_ADDRESS_FROM_REG8 = 31,
    SUBB_BYTE_FROM_REG8 = 32,
    INC_REG16 = 33,
    INCB_REG8 = 34,
    DEC_REG16 = 35,
    DECB_REG8 = 36,
    CMP_REG16_WITH_REG16 = 37,
    CMP_REGADDRESS_WITH_REG16 = 38,
    CMP_ADDRESS_WITH_REG16 = 39,
    CMP_WORD_WITH_REG16 = 40,
    CMPB_REG8_WITH_REG8 = 41,
    CMPB_REGADDRESS_WITH_REG8 = 42,
    CMPB_ADDRESS_WITH_REG8 = 43,
    CMPB_BYTE_WITH_REG8 = 44,
    JMP_REGADDRESS = 45,
    JMP_ADDRESS = 46,
    JC_REGADDRESS = 47,
    JC_ADDRESS = 48,
    JNC_REGADDRESS = 49,
    JNC_ADDRESS = 50,
    JZ_REGADDRESS = 51,
    JZ_ADDRESS = 52,
    JNZ_REGADDRESS = 53,
    JNZ_ADDRESS = 54,
    JA_REGADDRESS = 55,
    JA_ADDRESS = 56,
    JNA_REGADDRESS = 57,
    JNA_ADDRESS = 58,
    PUSH_REG16 = 59,
    PUSH_REGADDRESS = 60,
    PUSH_ADDRESS = 61,
    PUSH_WORD = 62,
    PUSHB_REG8 = 63,
    PUSHB_REGADDRESS = 64,
    PUSHB_ADDRESS = 65,
    PUSHB_BYTE = 66,
    POP_REG16 = 67,
    POPB_REG8 = 68,
    CALL_REGADDRESS = 69,
    CALL_ADDRESS = 70,
    RET = 71,
    MUL_REG16 = 72,
    MUL_REGADDRESS = 73,
    MUL_ADDRESS = 74,
    MUL_WORD = 75,
    MULB_REG8 = 76,
    MULB_REGADDRESS = 77,
    MULB_ADDRESS = 78,
    MULB_BYTE = 79,
    DIV_REG16 = 80,
    DIV_REGADDRESS = 81,
    DIV_ADDRESS = 82,
    DIV_WORD = 83,
    DIVB_REG8 = 84,
    DIVB_REGADDRESS = 85,
    DIVB_ADDRESS = 86,
    DIVB_BYTE = 87,
    AND_REG16_WITH_REG16 = 88,
    AND_REGADDRESS_WITH_REG16 = 89,
    AND_ADDRESS_WITH_REG16 = 90,
    AND_WORD_WITH_REG16 = 91,
    ANDB_REG8_WITH_REG8 = 92,
    ANDB_REGADDRESS_WITH_REG8 = 93,
    ANDB_ADDRESS_WITH_REG8 = 94,
    ANDB_BYTE_WITH_REG8 = 95,
    OR_REG16_WITH_REG16 = 96,
    OR_REGADDRESS_WITH_REG16 = 97,
    OR_ADDRESS_WITH_REG16 = 98,
    OR_WORD_WITH_REG16 = 99,
    ORB_REG8_WITH_REG8 = 100,
    ORB_REGADDRESS_WITH_REG8 = 101,
    ORB_ADDRESS_WITH_REG8 = 102,
    ORB_BYTE_WITH_REG8 = 103,
    XOR_REG16_WITH_REG16 = 104,
    XOR_REGADDRESS_WITH_REG16 = 105,
    XOR_ADDRESS_WITH_REG16 = 106,
    XOR_WORD_WITH_REG16 = 107,
    XORB_REG8_WITH_REG8 = 108,
    XORB_REGADDRESS_WITH_REG8 = 109,
    XORB_ADDRESS_WITH_REG8 = 110,
    XORB_BYTE_WITH_REG8 = 111,
    NOT_REG16 = 112,
    NOTB_REG8 = 113,
    SHL_REG16_WITH_REG16 = 114,
    SHL_REGADDRESS_WITH_REG16 = 115,
    SHL_ADDRESS_WITH_REG16 = 116,
    SHL_WORD_WITH_REG16 = 117,
    SHLB_REG8_WITH_REG8 = 118,
    SHLB_REGADDRESS_WITH_REG8 = 119,
    SHLB_ADDRESS_WITH_REG8 = 120,
    SHLB_BYTE_WITH_REG8 = 121,
    SHR_REG16_WITH_REG16 = 122,
    SHR_REGADDRESS_WITH_REG16 = 123,
    SHR_ADDRESS_WITH_REG16 = 124,
    SHR_WORD_WITH_REG16 = 125,
    SHRB_REG8_WITH_REG8 = 126,
    SHRB_REGADDRESS_WITH_REG8 = 127,
    SHRB_ADDRESS_WITH_REG8 = 128,
    SHRB_BYTE_WITH_REG8 = 129,
    CLI = 130,
    STI = 131,
    IRET = 132,
    SVC = 133,
    SRET = 134,
    IN_REG16 = 135,
    IN_REGADDRESS = 136,
    IN_ADDRESS = 137,
    IN_WORD = 138,
    OUT_REG16 = 139,
    OUT_REGADDRESS = 140,
    OUT_ADDRESS = 141,
    OUT_WORD = 142

}

export enum OperandType {

    REGISTER = -3, /* Internal type. Cannot be used in instruction definition. Represents register types */
    ARRAY = -2, /* Internal type. Cannot be used in instruction definition. Represents string types */
    NUMBER = -1, /* Internal type. Cannot be used in instruction definition. Represents numeric types */
    BYTE = 0,
    WORD = 1,
    REGISTER_8BITS = 2,
    REGISTER_16BITS = 3,
    ADDRESS = 4,
    REGADDRESS = 5, /* register addressing + offset */

}

export class InstructionSpec {

    public opcode: OpCode;
    public mnemonic: string;
    public operand1: OperandType;
    public operand2: OperandType;
    public methodName: string;
    public bytes: number;
    public aliases: Array<string>;

    constructor(opcode: OpCode, mnemonic: string, methodName: string,
                operand1?: OperandType, operand2?: OperandType,
                aliases?: Array<string>) {

        this.opcode = opcode;
        this.mnemonic = mnemonic;
        this.methodName = methodName;
        this.operand1 = operand1;
        this.operand2 = operand2;
        this.aliases = aliases;

        this.bytes = 1;

        switch (this.operand1) {
            case undefined:
                break;
            case OperandType.REGISTER_8BITS:
            case OperandType.REGISTER_16BITS:
            case OperandType.BYTE:
                this.bytes += 1;
                break;
            case OperandType.REGADDRESS:
            case OperandType.ADDRESS:
            case OperandType.WORD:
                this.bytes += 2;
                break;
            default:
                throw Error(`Invalid type for the first operand`);
        }

        switch (this.operand2) {
            case undefined:
                break;
            case OperandType.REGISTER_8BITS:
            case OperandType.REGISTER_16BITS:
            case OperandType.BYTE:
                this.bytes += 1;
                break;
            case OperandType.REGADDRESS:
            case OperandType.ADDRESS:
            case OperandType.WORD:
                this.bytes += 2;
                break;
            default:
                throw Error(`Invalid type for the first operand`);
        }

    }

}

export class InstructionSet {

    private instructionsMap: Map<OpCode, InstructionSpec> = new Map<OpCode, InstructionSpec>();
    private mnemonicsMap: Map<string, Array<InstructionSpec>> = new Map<string, Array<InstructionSpec>>();

    constructor() {}

    private static normalizeOperand(operand: OperandType): OperandType {

        switch (operand) {

            case OperandType.BYTE:
            case OperandType.WORD:
                return OperandType.NUMBER;
            case OperandType.REGISTER_8BITS:
            case OperandType.REGISTER_16BITS:
                return OperandType.REGISTER;
            default:
                return operand;
        }

    }

    public getMnemonics(): Array<string> {

        return Array.from(this.mnemonicsMap.keys());

    }

    public getInstruction(mnemonic: string, operand1: OperandType, operand2: OperandType): InstructionSpec {

        const mnemonicInstructions = this.mnemonicsMap.get(mnemonic);

        if (mnemonicInstructions === undefined) {
            throw Error(`Invalid instruction ${mnemonic}`);
        }

        for (const instr of mnemonicInstructions) {

            const lookupOperand1 = InstructionSet.normalizeOperand(operand1);
            const lookupOperand2 = InstructionSet.normalizeOperand(operand2);
            const instrOperand1 = InstructionSet.normalizeOperand(instr.operand1);
            const instrOperand2 = InstructionSet.normalizeOperand(instr.operand2);

            if (instrOperand1 === lookupOperand1 &&
                instrOperand2 === lookupOperand2) {
                return instr;
            }

        }

        throw Error(`${mnemonic} does not support these operands`);
    }

    public getInstructionFromOpCode(opcode: number): InstructionSpec {

        return this.instructionsMap.get(opcode);

    }

    public addInstruction(opcode: OpCode, mnemonic: string, methodName: string,
                          operand1: OperandType, operand2: OperandType,
                          aliases: Array<string>) {

        if (this.instructionsMap.has(opcode)) {
            throw Error(`OPCODE ${OpCode[opcode]} was already in the instruction set`);
        }

        if (operand1 < 0 || operand1 > OperandType.REGADDRESS) {
            throw Error(
                `Operand type (${OperandType[operand1]}) is not valid`);
        }

        if (operand2 < 0 || operand2 > OperandType.REGADDRESS) {
            throw Error(
                `Operand type (${OperandType[operand2]}) is not valid`);
        }

        const newInstruction = new InstructionSpec(opcode, mnemonic, methodName, operand1, operand2, aliases);

        const mnemonics: Array<string> = [mnemonic];

        if (aliases) {
            for (const mn of aliases) {
                mnemonics.push(mn);
            }
        }

        for (const mn of mnemonics) {

            let mnemonicInstructions = this.mnemonicsMap.get(mn);

            if (mnemonicInstructions === undefined) {

                mnemonicInstructions = [];
                this.mnemonicsMap.set(mn, mnemonicInstructions);

            } else {

                for (const instr of mnemonicInstructions) {

                    const newOperand1 = InstructionSet.normalizeOperand(newInstruction.operand1);
                    const newOperand2 = InstructionSet.normalizeOperand(newInstruction.operand2);
                    const instrOperand1 = InstructionSet.normalizeOperand(instr.operand1);
                    const instrOperand2 = InstructionSet.normalizeOperand(instr.operand2);

                    if (instrOperand1 === newOperand1 &&
                        instrOperand2 === newOperand2) {
                        throw Error(
                            `Instruction ${mn} with operands ` +
                            `(${OperandType[instrOperand1]}) (${OperandType[instrOperand2]}) is already in the set`);
                    }
                }

            }

            this.instructionsMap.set(opcode, newInstruction);
            mnemonicInstructions.push(newInstruction);
        }

    }
}

export const instructionSet: InstructionSet = new InstructionSet();


export function Instruction(opcode: OpCode, mnemonic: string, operand1?: OperandType,
                            operand2?: OperandType, aliases?: Array<string>) {

    let instructionArguments = 0;

    switch (operand1) {
        case undefined:
            break;
        case OperandType.REGISTER_8BITS:
        case OperandType.REGISTER_16BITS:
        case OperandType.ADDRESS:
        case OperandType.WORD:
        case OperandType.BYTE:
        case OperandType.REGADDRESS:
            instructionArguments += 1;
            break;
        default:
            throw Error(`Invalid type for the first operand`);
    }

    switch (operand2) {
        case undefined:
            break;
        case OperandType.REGISTER_8BITS:
        case OperandType.REGISTER_16BITS:
        case OperandType.ADDRESS:
        case OperandType.WORD:
        case OperandType.BYTE:
        case OperandType.REGADDRESS:
            instructionArguments += 1;
            break;
        default:
            throw Error(`Invalid type for the second operand`);
    }

    function installInstruction(target: any, propertyKey: string): void {
        if (target[propertyKey].length !== instructionArguments) {
            throw Error(`Invalid number of arguments of function ${propertyKey}(): ` +
                `${instructionArguments} where required and ${target[propertyKey].length} where provided`);
        }
        instructionSet.addInstruction(opcode, mnemonic, propertyKey, operand1, operand2, aliases);
    }
    return installInstruction;

}
