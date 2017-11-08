import {} from 'reflect-metadata';


export enum OpCode {

    HLT = 0, /* Halts the CPU */
    MOV_REG_TO_REG = 1,
    MOV_ADDRESS_TO_REG = 2,
    MOV_REGADDRESS_TO_REG = 3,
    MOV_REG_TO_ADDRESS = 4,
    MOV_REG_TO_REGADDRESS = 5,
    MOV_WORD_TO_REG = 6,
    MOV_WORD_TO_ADDRESS = 7,
    MOV_WORD_TO_REGADDRESS = 8,
    MOVB_ADDRESS_TO_REG = 9,
    MOVB_REGADDRESS_TO_REG = 10,
    MOVB_REG_TO_ADDRESS = 11,
    MOVB_REG_TO_REGADDRESS = 12,
    MOVB_BYTE_TO_REG = 13,
    MOVB_BYTE_TO_ADDRESS = 14,
    MOVB_BYTE_TO_REGADDRESS = 15,
    ADD_REG_TO_REG = 16,
    ADD_REGADDRESS_TO_REG = 17,
    ADD_ADDRESS_TO_REG = 18,
    ADD_WORD_TO_REG = 19,
    ADDB_REGADDRESS_TO_REG = 20,
    ADDB_ADDRESS_TO_REG = 21,
    ADDB_BYTE_TO_REG = 22,
    SUB_REG_FROM_REG = 23,
    SUB_REGADDRESS_FROM_REG = 24,
    SUB_ADDRESS_FROM_REG = 25,
    SUB_WORD_FROM_REG = 26,
    SUBB_REGADDRESS_FROM_REG = 27,
    SUBB_ADDRESS_FROM_REG = 28,
    SUBB_BYTE_FROM_REG = 29,
    INC_REG = 30,
    DEC_REG = 31,
    CMP_REG_WITH_REG = 32,
    CMP_REGADDRESS_WITH_REG = 33,
    CMP_ADDRESS_WITH_REG = 34,
    CMP_WORD_WITH_REG = 35,
    CMPB_REGADDRESS_WITH_REG = 36,
    CMPB_ADDRESS_WITH_REG = 37,
    CMPB_BYTE_WITH_REG = 38,
    JMP_REGADDRESS = 39,
    JMP_ADDRESS = 40,
    JC_REGADDRESS = 41,
    JC_ADDRESS = 42,
    JNC_REGADDRESS = 43,
    JNC_ADDRESS = 44,
    JZ_REGADDRESS = 45,
    JZ_ADDRESS = 46,
    JNZ_REGADDRESS = 47,
    JNZ_ADDRESS = 48,
    JA_REGADDRESS = 49,
    JA_ADDRESS = 50,
    JNA_REGADDRESS = 51,
    JNA_ADDRESS = 52,
    PUSH_REG = 53,
    PUSH_REGADDRESS = 54,
    PUSH_ADDRESS = 55,
    PUSH_WORD = 56,
    PUSHB_REG = 57,
    PUSHB_REGADDRESS = 58,
    PUSHB_ADDRESS = 59,
    PUSHB_BYTE = 60,
    POP_REG = 61,
    POPB_REG = 62,
    CALL_REGADDRESS = 63,
    CALL_ADDRESS = 64,
    RET = 65,
    MUL_REG = 66,
    MUL_REGADDRESS = 67,
    MUL_ADDRESS = 68,
    MUL_WORD = 69,
    MULB_REGADDRESS = 70,
    MULB_ADDRESS = 71,
    MULB_BYTE = 72,
    DIV_REG = 73,
    DIV_REGADDRESS = 74,
    DIV_ADDRESS = 75,
    DIV_WORD = 76,
    DIVB_REGADDRESS = 77,
    DIVB_ADDRESS = 78,
    DIVB_BYTE = 79,
    AND_REG_WITH_REG = 80,
    AND_REGADDRESS_WITH_REG = 81,
    AND_ADDRESS_WITH_REG = 82,
    AND_WORD_WITH_REG = 83,
    ANDB_REGADDRESS_WITH_REG = 84,
    ANDB_ADDRESS_WITH_REG = 85,
    ANDB_BYTE_WITH_REG = 86,
    OR_REG_WITH_REG = 87,
    OR_REGADDRESS_WITH_REG = 88,
    OR_ADDRESS_WITH_REG = 89,
    OR_WORD_WITH_REG = 90,
    ORB_REGADDRESS_WITH_REG = 91,
    ORB_ADDRESS_WITH_REG = 92,
    ORB_BYTE_WITH_REG = 93,
    XOR_REG_WITH_REG = 94,
    XOR_REGADDRESS_WITH_REG = 95,
    XOR_ADDRESS_WITH_REG = 96,
    XOR_WORD_WITH_REG = 97,
    XORB_REGADDRESS_WITH_REG = 98,
    XORB_ADDRESS_WITH_REG = 99,
    XORB_BYTE_WITH_REG = 100,
    NOT_REG = 101,
    SHL_REG_WITH_REG = 102,
    SHL_REGADDRESS_WITH_REG = 103,
    SHL_ADDRESS_WITH_REG = 104,
    SHL_WORD_WITH_REG = 105,
    SHLB_REGADDRESS_WITH_REG = 106,
    SHLB_ADDRESS_WITH_REG = 107,
    SHLB_BYTE_WITH_REG = 108,
    SHR_REG_WITH_REG = 109,
    SHR_REGADDRESS_WITH_REG = 110,
    SHR_ADDRESS_WITH_REG = 111,
    SHR_WORD_WITH_REG = 112,
    SHRB_REGADDRESS_WITH_REG = 113,
    SHRB_ADDRESS_WITH_REG = 114,
    SHRB_BYTE_WITH_REG = 115,
    CLI = 116,
    STI = 117,
    IRET = 118,
    SYSCALL = 119,
    SYSRET = 120

}

export enum OperandType {

    ARRAY = -2, /* Internal type. Cannot be used in instruction definition. Represents string types */
    NUMBER = -1, /* Internal type. Cannot be used in instruction definition. Represents numeric types */
    BYTE = 0,
    WORD = 1,
    REGISTER = 2,
    ADDRESS = 3,
    REGADDRESS = 4, /* register addressing + offset */

}

export class InstructionSpec {

    public opcode: OpCode;
    public mnemonic: string;
    public operand1: OperandType;
    public operand2: OperandType;
    public methodName: string;
    public bytes: number;

    constructor(opcode: OpCode, mnemonic: string, methodName: string,
                operand1?: OperandType, operand2?: OperandType) {

        this.opcode = opcode;
        this.mnemonic = mnemonic;
        this.methodName = methodName;
        this.operand1 = operand1;
        this.operand2 = operand2;

        this.bytes = 1;

        switch (this.operand1) {
            case undefined:
                break;
            case OperandType.REGISTER:
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
            case OperandType.REGISTER:
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

    public getInstruction(mnemonic: string, operand1: OperandType, operand2: OperandType): InstructionSpec {

        const mnemonicInstructions = this.mnemonicsMap.get(mnemonic);

        if (mnemonicInstructions === undefined) {
            throw Error(`Invalid instruction ${mnemonic}`);
        }

        for (const instr of mnemonicInstructions) {

            const lookupOperand1 = (operand1 === OperandType.BYTE ||
                operand1 === OperandType.WORD) ? OperandType.NUMBER : operand1;
            const lookupOperand2 = (operand2 === OperandType.BYTE ||
                operand2 === OperandType.WORD) ? OperandType.NUMBER : operand2;
            const instrOperand1 = (instr.operand1 === OperandType.BYTE ||
                instr.operand1 === OperandType.WORD) ? OperandType.NUMBER : instr.operand1;
            const instrOperand2 = (instr.operand2 === OperandType.BYTE ||
                instr.operand2 === OperandType.WORD) ? OperandType.NUMBER : instr.operand2;

            if (instrOperand1 === lookupOperand1 &&
                instrOperand2 === lookupOperand2) {
                return instr;
            }

        }

        throw Error(`${mnemonic} does not support these operands`);
    }

    public addInstruction(opcode: OpCode, mnemonic: string, methodName: string,
                          operand1: OperandType, operand2: OperandType) {

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

        const newInstruction = new InstructionSpec(opcode, mnemonic, methodName, operand1, operand2);

        let mnemonicInstructions = this.mnemonicsMap.get(mnemonic);

        if (mnemonicInstructions === undefined) {

            mnemonicInstructions = [];
            this.mnemonicsMap.set(mnemonic, mnemonicInstructions);

        } else {

            for (const instr of mnemonicInstructions) {

                const newOperand1 = (newInstruction.operand1 === OperandType.BYTE ||
                    newInstruction.operand1 === OperandType.WORD) ? OperandType.NUMBER : newInstruction.operand1;
                const newOperand2 = (newInstruction.operand2 === OperandType.BYTE ||
                    newInstruction.operand2 === OperandType.WORD) ? OperandType.NUMBER : newInstruction.operand2;
                const instrOperand1 = (instr.operand1 === OperandType.BYTE ||
                    instr.operand1 === OperandType.WORD) ? OperandType.NUMBER : instr.operand1;
                const instrOperand2 = (instr.operand2 === OperandType.BYTE ||
                    instr.operand2 === OperandType.WORD) ? OperandType.NUMBER : instr.operand2;

                if (instrOperand1 === newOperand1 &&
                    instrOperand2 === newOperand2) {
                    throw Error(
                        `Instruction ${mnemonic} with operands ` +
                        `(${OperandType[instrOperand1]}) (${OperandType[instrOperand2]}) is already in the set`);
                }
            }

        }

        this.instructionsMap.set(opcode, newInstruction);
        mnemonicInstructions.push(newInstruction);

    }
}

export const instructionSet: InstructionSet = new InstructionSet();


export function Instruction(opcode: OpCode, mnemonic: string, operand1?: OperandType, operand2?: OperandType) {

    let instructionArguments = 0;

    switch (operand1) {
        case undefined:
            break;
        case OperandType.REGISTER:
        case OperandType.ADDRESS:
        case OperandType.WORD:
        case OperandType.BYTE:
            instructionArguments += 1;
            break;
        case OperandType.REGADDRESS:
            instructionArguments += 2;
            break;
        default:
            throw Error(`Invalid type for the first operand`);
    }

    switch (operand2) {
        case undefined:
            break;
        case OperandType.REGISTER:
        case OperandType.ADDRESS:
        case OperandType.WORD:
        case OperandType.BYTE:
            instructionArguments += 1;
            break;
        case OperandType.REGADDRESS:
            instructionArguments += 2;
            break;
        default:
            throw Error(`Invalid type for the second operand`);
    }

    function installInstruction(target: any, propertyKey: string): void {
        if (target[propertyKey].length !== instructionArguments) {
            throw Error(`Invalid number of arguments of function ${propertyKey}(): ` +
                `${instructionArguments} where required and ${target[propertyKey].length} where provided`);
        }
        instructionSet.addInstruction(opcode, mnemonic, propertyKey, operand1, operand2);
    }
    return installInstruction;

}
