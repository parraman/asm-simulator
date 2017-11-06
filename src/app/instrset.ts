
export enum OpCode {

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
    SHR_NUMBER_WITH_REG = 97,
    CLI = 98,
    STI = 99

}

export enum OperandType {

    NUMBER = 0,
    NUMBERS = 1,
    REGISTER = 2,
    ADDRESS = 3,
    REGADDRESS = 4,

}

export class Instruction {

    public opcode: OpCode;
    public mnemonic: string;
    public operand1: OperandType;
    public operand2: OperandType;

    constructor(opcode: OpCode, mnemonic: string, operand1?: OperandType, operand2?: OperandType) {

        this.opcode = opcode;
        this.mnemonic = mnemonic;
        this.operand1 = operand1;
        this.operand2 = operand2;

    }

}

export class InstructionSet {

    private instructionsMap: Map<OpCode, Instruction> = new Map<OpCode, Instruction>();
    private mnemonicsMap: Map<string, Array<Instruction>> = new Map<string, Array<Instruction>>();

    constructor() {}

    public getInstruction(mnemonic: string, operand1: OperandType, operand2: OperandType) {

        const mnemonicInstructions = this.mnemonicsMap.get(mnemonic);

        if (mnemonicInstructions === undefined) {
            throw Error(`Invalid instruction ${mnemonic}`);
        }

        for (const instr of mnemonicInstructions) {

            if (instr.operand1 === operand1 &&
                instr.operand2 === operand2) {
                return instr.opcode;
            }

        }

        throw Error(`${mnemonic} does not support these operands`);
    }

    public addInstruction(opcode: OpCode, mnemonic: string, operand1?: OperandType, operand2?: OperandType) {

        if (this.instructionsMap.has(opcode)) {
            throw Error(`OPCODE ${OpCode[opcode]} was already in the instruction set`);
        }

        const newInstruction = new Instruction(opcode, mnemonic, operand1, operand2);

        let mnemonicInstructions = this.mnemonicsMap.get(mnemonic);

        if (mnemonicInstructions === undefined) {

            mnemonicInstructions = [];
            this.mnemonicsMap.set(mnemonic, mnemonicInstructions);

        } else {

            for (const instr of mnemonicInstructions) {
                if (instr.operand1 === newInstruction.operand1 &&
                    instr.operand2 === newInstruction.operand2) {
                    throw Error(
                        `Instruction ${mnemonic} with operands ` +
                        `(${OperandType[operand1]}) (${OperandType[operand2]}) is already in the set`);
                }
            }

        }

        this.instructionsMap.set(opcode, newInstruction);
        mnemonicInstructions.push(newInstruction);

    }
}

export const instructionSet: InstructionSet = new InstructionSet();

instructionSet.addInstruction(OpCode.NONE, 'HLT');
instructionSet.addInstruction(OpCode.MOV_REG_TO_REG, 'MOV', OperandType.REGISTER, OperandType.REGISTER);
instructionSet.addInstruction(OpCode.MOV_ADDRESS_TO_REG, 'MOV', OperandType.REGISTER, OperandType.ADDRESS);
instructionSet.addInstruction(OpCode.MOV_REGADDRESS_TO_REG, 'MOV', OperandType.REGISTER, OperandType.REGADDRESS);
instructionSet.addInstruction(OpCode.MOV_REG_TO_ADDRESS, 'MOV', OperandType.ADDRESS, OperandType.REGISTER);
instructionSet.addInstruction(OpCode.MOV_REG_TO_REGADDRESS, 'MOV', OperandType.REGADDRESS, OperandType.REGISTER);
instructionSet.addInstruction(OpCode.MOV_NUMBER_TO_REG, 'MOV', OperandType.REGISTER, OperandType.NUMBER);
instructionSet.addInstruction(OpCode.MOV_NUMBER_TO_ADDRESS, 'MOV', OperandType.ADDRESS, OperandType.NUMBER);
instructionSet.addInstruction(OpCode.MOV_NUMBER_TO_REGADDRESS, 'MOV', OperandType.REGADDRESS, OperandType.NUMBER);
instructionSet.addInstruction(OpCode.ADD_REG_TO_REG, 'ADD', OperandType.REGISTER, OperandType.REGISTER);
instructionSet.addInstruction(OpCode.ADD_REGADDRESS_TO_REG, 'ADD', OperandType.REGISTER, OperandType.REGADDRESS);
instructionSet.addInstruction(OpCode.ADD_ADDRESS_TO_REG, 'ADD', OperandType.REGISTER, OperandType.ADDRESS);
instructionSet.addInstruction(OpCode.ADD_NUMBER_TO_REG, 'ADD', OperandType.REGISTER, OperandType.NUMBER);
instructionSet.addInstruction(OpCode.SUB_REG_FROM_REG, 'SUB', OperandType.REGISTER, OperandType.REGISTER);
instructionSet.addInstruction(OpCode.SUB_REGADDRESS_FROM_REG, 'SUB', OperandType.REGISTER, OperandType.REGADDRESS);
instructionSet.addInstruction(OpCode.SUB_ADDRESS_FROM_REG, 'SUB', OperandType.REGISTER, OperandType.ADDRESS);
instructionSet.addInstruction(OpCode.SUB_NUMBER_FROM_REG, 'SUB', OperandType.REGISTER, OperandType.NUMBER);
instructionSet.addInstruction(OpCode.INC_REG, 'INC', OperandType.REGISTER);
instructionSet.addInstruction(OpCode.DEC_REG, 'DEC', OperandType.REGISTER);
instructionSet.addInstruction(OpCode.CMP_REG_WITH_REG, 'CMP', OperandType.REGISTER, OperandType.REGISTER);
instructionSet.addInstruction(OpCode.CMP_REGADDRESS_WITH_REG, 'CMP', OperandType.REGISTER, OperandType.REGADDRESS);
instructionSet.addInstruction(OpCode.CMP_ADDRESS_WITH_REG, 'CMP', OperandType.REGISTER, OperandType.ADDRESS);
instructionSet.addInstruction(OpCode.CMP_NUMBER_WITH_REG, 'CMP', OperandType.REGISTER, OperandType.NUMBER);
instructionSet.addInstruction(OpCode.JMP_REGADDRESS, 'JMP', OperandType.REGADDRESS);
instructionSet.addInstruction(OpCode.JMP_ADDRESS, 'JMP', OperandType.NUMBER);
instructionSet.addInstruction(OpCode.JC_REGADDRESS, 'JC', OperandType.REGADDRESS);
instructionSet.addInstruction(OpCode.JC_ADDRESS, 'JC', OperandType.NUMBER);
instructionSet.addInstruction(OpCode.JNC_REGADDRESS, 'JNC', OperandType.REGADDRESS);
instructionSet.addInstruction(OpCode.JNC_ADDRESS, 'JNC', OperandType.NUMBER);
instructionSet.addInstruction(OpCode.JZ_REGADDRESS, 'JZ', OperandType.REGADDRESS);
instructionSet.addInstruction(OpCode.JZ_ADDRESS, 'JZ', OperandType.NUMBER);
instructionSet.addInstruction(OpCode.JNZ_REGADDRESS, 'JNZ', OperandType.REGADDRESS);
instructionSet.addInstruction(OpCode.JNZ_ADDRESS, 'JNZ', OperandType.NUMBER);
instructionSet.addInstruction(OpCode.JA_REGADDRESS, 'JA', OperandType.REGADDRESS);
instructionSet.addInstruction(OpCode.JA_ADDRESS, 'JA', OperandType.NUMBER);
instructionSet.addInstruction(OpCode.JNA_REGADDRESS, 'JNA', OperandType.REGADDRESS);
instructionSet.addInstruction(OpCode.JNA_ADDRESS, 'JNA', OperandType.NUMBER);
instructionSet.addInstruction(OpCode.PUSH_REG, 'PUSH', OperandType.REGISTER);
instructionSet.addInstruction(OpCode.PUSH_REGADDRESS, 'PUSH', OperandType.REGADDRESS);
instructionSet.addInstruction(OpCode.PUSH_ADDRESS, 'PUSH', OperandType.ADDRESS);
instructionSet.addInstruction(OpCode.PUSH_NUMBER, 'PUSH', OperandType.NUMBER);
instructionSet.addInstruction(OpCode.POP_REG, 'POP', OperandType.REGISTER);
instructionSet.addInstruction(OpCode.CALL_REGADDRESS, 'CALL', OperandType.REGADDRESS);
instructionSet.addInstruction(OpCode.CALL_ADDRESS, 'CALL', OperandType.NUMBER);
instructionSet.addInstruction(OpCode.RET, 'RET');
instructionSet.addInstruction(OpCode.MUL_REG, 'MUL', OperandType.REGISTER);
instructionSet.addInstruction(OpCode.MUL_REGADDRESS, 'MUL', OperandType.REGADDRESS);
instructionSet.addInstruction(OpCode.MUL_ADDRESS, 'MUL', OperandType.ADDRESS);
instructionSet.addInstruction(OpCode.MUL_NUMBER, 'MUL', OperandType.NUMBER);
instructionSet.addInstruction(OpCode.DIV_REG, 'DIV', OperandType.REGISTER);
instructionSet.addInstruction(OpCode.DIV_REGADDRESS, 'DIV', OperandType.REGADDRESS);
instructionSet.addInstruction(OpCode.DIV_ADDRESS, 'DIV', OperandType.ADDRESS);
instructionSet.addInstruction(OpCode.DIV_NUMBER, 'DIV', OperandType.NUMBER);
instructionSet.addInstruction(OpCode.AND_REG_WITH_REG, 'AND', OperandType.REGISTER, OperandType.REGISTER);
instructionSet.addInstruction(OpCode.AND_REGADDRESS_WITH_REG, 'AND', OperandType.REGISTER, OperandType.REGADDRESS);
instructionSet.addInstruction(OpCode.AND_ADDRESS_WITH_REG, 'AND', OperandType.REGISTER, OperandType.ADDRESS);
instructionSet.addInstruction(OpCode.AND_NUMBER_WITH_REG, 'AND', OperandType.REGISTER, OperandType.NUMBER);
instructionSet.addInstruction(OpCode.OR_REG_WITH_REG, 'OR', OperandType.REGISTER, OperandType.REGISTER);
instructionSet.addInstruction(OpCode.OR_REGADDRESS_WITH_REG, 'OR', OperandType.REGISTER, OperandType.REGADDRESS);
instructionSet.addInstruction(OpCode.OR_ADDRESS_WITH_REG, 'OR', OperandType.REGISTER, OperandType.ADDRESS);
instructionSet.addInstruction(OpCode.OR_NUMBER_WITH_REG, 'OR', OperandType.REGISTER, OperandType.NUMBER);
instructionSet.addInstruction(OpCode.XOR_REG_WITH_REG, 'XOR', OperandType.REGISTER, OperandType.REGISTER);
instructionSet.addInstruction(OpCode.XOR_REGADDRESS_WITH_REG, 'XOR', OperandType.REGISTER, OperandType.REGADDRESS);
instructionSet.addInstruction(OpCode.XOR_ADDRESS_WITH_REG, 'XOR', OperandType.REGISTER, OperandType.ADDRESS);
instructionSet.addInstruction(OpCode.XOR_NUMBER_WITH_REG, 'XOR', OperandType.REGISTER, OperandType.NUMBER);
instructionSet.addInstruction(OpCode.NOT_REG, 'NOT', OperandType.REGISTER);
instructionSet.addInstruction(OpCode.SHL_REG_WITH_REG, 'SHL', OperandType.REGISTER, OperandType.REGISTER);
instructionSet.addInstruction(OpCode.SHL_REGADDRESS_WITH_REG, 'SHL', OperandType.REGISTER, OperandType.REGADDRESS);
instructionSet.addInstruction(OpCode.SHL_ADDRESS_WITH_REG, 'SHL', OperandType.REGISTER, OperandType.ADDRESS);
instructionSet.addInstruction(OpCode.SHL_NUMBER_WITH_REG, 'SHL', OperandType.REGISTER, OperandType.NUMBER);
instructionSet.addInstruction(OpCode.SHR_REG_WITH_REG, 'SHR', OperandType.REGISTER, OperandType.REGISTER);
instructionSet.addInstruction(OpCode.SHR_REGADDRESS_WITH_REG, 'SHR', OperandType.REGISTER, OperandType.REGADDRESS);
instructionSet.addInstruction(OpCode.SHR_ADDRESS_WITH_REG, 'SHR', OperandType.REGISTER, OperandType.ADDRESS);
instructionSet.addInstruction(OpCode.SHR_NUMBER_WITH_REG, 'SHR', OperandType.REGISTER, OperandType.NUMBER);
instructionSet.addInstruction(OpCode.CLI, 'CLI');
instructionSet.addInstruction(OpCode.STI, 'STI');
