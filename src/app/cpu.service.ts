import { Injectable } from '@angular/core';

import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';

import { OpCode, OperandType, Instruction } from './instrset';
import { MemoryService } from './memory.service';


const REGISTERS_NUM = 7;

enum SRBit {

    HALT = 0,
    FAULT = 1,
    ZERO = 2,
    CARRY = 3,
    IRQMASK = 4,
    SUPERVISOR = 15

}

export enum CPURegister {

    A = 0,
    B = 1,
    C = 2,
    D = 3,
    SP = 4,
    SR = 5,
    IP = 6

}

export enum CPURegisterOperationType {

    READ = 1,
    WRITE = 2

}

export class CPURegisterOperation {

    public operationType: CPURegisterOperationType;
    public register: CPURegister;
    public value: number;

    constructor(operationType: CPURegisterOperationType, register: CPURegister, value: number) {

        this.operationType = operationType;
        this.register = register;
        this.value = value;

    }

}

@Injectable()
export class CPUService {

    private registersBank: Array<number> = new Array<number>(REGISTERS_NUM);

    private cpuRegisterOperationSource = new Subject<CPURegisterOperation>();

    public cpuRegisterOperation$: Observable<CPURegisterOperation>;

    private static isGPR(register: number): boolean {

        return (register === CPURegister.A ||
            register === CPURegister.B ||
            register === CPURegister.C ||
            register === CPURegister.D);

    }

    private static isGPRorSP(register: number): boolean {

        return (CPUService.isGPR(register) || register === CPURegister.SP);

    }

    constructor(protected memoryService: MemoryService) {

        this.registersBank[CPURegister.A] = 0;
        this.registersBank[CPURegister.B] = 0;
        this.registersBank[CPURegister.C] = 0;
        this.registersBank[CPURegister.D] = 0;
        this.registersBank[CPURegister.SP] = 0;
        this.registersBank[CPURegister.SR] = 0x8000;
        this.registersBank[CPURegister.IP] = 0;

        this.cpuRegisterOperation$ = this.cpuRegisterOperationSource.asObservable();

    }

    public getRegistersBank(): Array<number> {

        return this.registersBank;

    }

    private setIP(address: number) {

        if (address < 0 || address >= this.memoryService.getSize()) {
            throw Error(`IP out of memory: ${address}):`);
        }

        this.registersBank[CPURegister.IP] = address;

    }

    private setSRBit(bit: SRBit) {

        this.registersBank[CPURegister.SR] |= (1 << bit);

    }

    private clearSRBit(bit: SRBit) {

        this.registersBank[CPURegister.SR] &= ~(1 << bit);

    }

    private isSetSRBit(bit: SRBit): boolean {

        return ((this.registersBank[CPURegister.SR] & (1 << bit)) === (1 << bit));

    }

    private checkOperation(value: number): number {

        this.clearSRBit(SRBit.CARRY);
        this.clearSRBit(SRBit.ZERO);

        if (value >= 65535) {
            this.setSRBit(SRBit.CARRY);
            value = value % 65536;
        } else if (value === 0) {
            this.setSRBit(SRBit.ZERO);
        } else if (value < 0) {
            this.setSRBit(SRBit.CARRY);
            value = 65536 - (-value) % 65536;
        }

        return value;

    }

    private pushByte(value: number) {

        this.memoryService.storeByte(this.registersBank[CPURegister.SP], value);
        this.registersBank[CPURegister.SP] -= 1;

    }

    private pushWord(value: number) {

        this.registersBank[CPURegister.SP] -= 1;
        this.memoryService.storeWord(this.registersBank[CPURegister.SP], value);
        this.registersBank[CPURegister.SP] -= 1;

    }

    private popByte(): number {

        this.registersBank[CPURegister.SP] += 1;
        const value = this.memoryService.loadByte(this.registersBank[CPURegister.SP]);

        return value;

    }

    private popWord(): number {

        this.registersBank[CPURegister.SP] += 1;
        const value = this.memoryService.loadWord(this.registersBank[CPURegister.SP]);
        this.registersBank[CPURegister.SP] += 1;

        return value;

    }

    private divide(divisor) {

        if (divisor === 0) {
            throw Error('Division by 0');
        }

        return Math.floor(this.registersBank[CPURegister.A] / divisor);
    }

    @Instruction(OpCode.HLT, 'HLT')
    private instrHLT(): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.MOV_REG_TO_REG, 'MOV', OperandType.REGISTER, OperandType.REGISTER)
    private instrMOV_REG_TO_REG(toRegister: number, fromRegister: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.MOV_ADDRESS_TO_REG, 'MOV', OperandType.REGISTER, OperandType.ADDRESS)
    private instrMOV_ADDRESS_TO_REG(toRegister: number, fromAddress: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.MOV_REGADDRESS_TO_REG, 'MOV', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrMOV_REGADDRESS_TO_REG(toRegister: number, fromRegister: number, fromOffset): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.MOV_REG_TO_ADDRESS, 'MOV', OperandType.ADDRESS, OperandType.REGISTER)
    private instrMOV_REG_TO_ADDRESS(toAddress: number, fromRegister: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.MOV_REG_TO_REGADDRESS, 'MOV', OperandType.REGADDRESS, OperandType.REGISTER)
    private instrMOV_REG_TO_REGADDRESS(toAddress: number, toOffset: number, fromRegister: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.MOV_WORD_TO_REG, 'MOV', OperandType.REGISTER, OperandType.WORD)
    private instrMOV_WORD_TO_REG(toRegister: number, word: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.MOV_WORD_TO_ADDRESS, 'MOV', OperandType.ADDRESS, OperandType.WORD)
    private instrMOV_WORD_TO_ADDRESS(toAddress: number, word: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.MOV_WORD_TO_REGADDRESS, 'MOV', OperandType.REGADDRESS, OperandType.WORD)
    private instrMOV_WORD_TO_REGADDRESS(toRegister: number, toOffset: number, word: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.MOVB_ADDRESS_TO_REG, 'MOVB', OperandType.REGISTER, OperandType.ADDRESS)
    private instrMOVB_ADDRESS_TO_REG(toRegister: number, fromAddress: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.MOVB_REGADDRESS_TO_REG, 'MOVB', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrMOVB_REGADDRESS_TO_REG(toRegister: number, fromRegister: number, fromOffset: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.MOVB_REG_TO_ADDRESS, 'MOVB', OperandType.ADDRESS, OperandType.REGISTER)
    private instrMOVB_REG_TO_ADDRESS(toAddress: number, fromRegister: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.MOVB_REG_TO_REGADDRESS, 'MOVB', OperandType.REGADDRESS, OperandType.REGISTER)
    private instrMOVB_REG_TO_REGADDRESS(toRegister: number, toOffset: number, fromRegister: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.MOVB_BYTE_TO_REG, 'MOVB', OperandType.REGISTER, OperandType.BYTE)
    private instrMOVB_BYTE_TO_REG(toRegister: number, byte: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.MOVB_BYTE_TO_ADDRESS, 'MOVB', OperandType.ADDRESS, OperandType.BYTE)
    private instrMOVB_BYTE_TO_ADDRESS(toAddress: number, byte: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.MOVB_BYTE_TO_REGADDRESS, 'MOVB', OperandType.REGADDRESS, OperandType.BYTE)
    private instrMOVB_BYTE_TO_REGADDRESS(toRegister: number, toOffset: number, byte: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.ADD_REG_TO_REG, 'ADD', OperandType.REGISTER, OperandType.REGISTER)
    private instrADD_REG_TO_REG(toRegister: number, fromRegister: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.ADD_REGADDRESS_TO_REG, 'ADD', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrADD_REGADDRESS_TO_REG(toRegister: number, fromRegister: number, fromOffset: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.ADD_ADDRESS_TO_REG, 'ADD', OperandType.REGISTER, OperandType.ADDRESS)
    private instrADD_ADDRESS_TO_REG(toRegister: number, fromAddress: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.ADD_WORD_TO_REG, 'ADD', OperandType.REGISTER, OperandType.WORD)
    private instrADD_WORD_TO_REG(toRegister: number, word: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.ADDB_REGADDRESS_TO_REG, 'ADDB', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrADDB_REGADDRESS_TO_REG(toRegister: number, fromRegister: number, fromOffset: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.ADDB_ADDRESS_TO_REG, 'ADDB', OperandType.REGISTER, OperandType.ADDRESS)
    private instrADDB_ADDRESS_TO_REG(toRegister: number, fromAddress: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.ADDB_BYTE_TO_REG, 'ADDB', OperandType.REGISTER, OperandType.BYTE)
    private instrADDB_BYTE_TO_REG(toRegister: number, byte: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.SUB_REG_FROM_REG, 'SUB', OperandType.REGISTER, OperandType.REGISTER)
    private instrSUB_REG_FROM_REG(toRegister: number, fromRegister: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.SUB_REGADDRESS_FROM_REG, 'SUB', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrSUB_REGADDRESS_FROM_REG(toRegister: number, fromRegister: number, fromOffset: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.SUB_ADDRESS_FROM_REG, 'SUB', OperandType.REGISTER, OperandType.ADDRESS)
    private instrSUB_ADDRESS_FROM_REG(toRegister: number, fromAddress: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.SUB_WORD_FROM_REG, 'SUB', OperandType.REGISTER, OperandType.WORD)
    private instrSUB_WORD_FROM_REG(toRegister: number, word: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.SUBB_REGADDRESS_FROM_REG, 'SUBB', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrSUBB_REGADDRESS_FROM_REG(toRegister: number, fromRegister: number, fromOffset: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.SUBB_ADDRESS_FROM_REG, 'SUBB', OperandType.REGISTER, OperandType.ADDRESS)
    private instrSUBB_ADDRESS_FROM_REG(toRegister: number, fromAddress: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.SUBB_BYTE_FROM_REG, 'SUBB', OperandType.REGISTER, OperandType.BYTE)
    private instrSUBB_BYTE_FROM_REG(toRegister: number, byte: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.INC_REG, 'INC', OperandType.REGISTER)
    private instrINC_REG(toRegister: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.DEC_REG, 'DEC', OperandType.REGISTER)
    private instrDEC_REG(toRegister: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.CMP_REG_WITH_REG, 'CMP', OperandType.REGISTER, OperandType.REGISTER)
    private instrCMP_REG_WITH_REG(toRegister: number, fromRegister: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.CMP_REGADDRESS_WITH_REG, 'CMP', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrCMP_REGADDRESS_WITH_REG(toRegister: number, fromRegister: number, fromOffset: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.CMP_ADDRESS_WITH_REG, 'CMP', OperandType.REGISTER, OperandType.ADDRESS)
    private instrCMP_ADDRESS_WITH_REG(toRegister: number, fromAddress: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.CMP_WORD_WITH_REG, 'CMP', OperandType.REGISTER, OperandType.WORD)
    private instrCMP_WORD_WITH_REG(toRegister: number, word: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.CMPB_REGADDRESS_WITH_REG, 'CMPB', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrCMPB_REGADDRESS_WITH_REG(toRegister: number, fromRegister: number, fromOffset: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.CMPB_ADDRESS_WITH_REG, 'CMPB', OperandType.REGISTER, OperandType.ADDRESS)
    private instrCMPB_ADDRESS_WITH_REG(toRegister: number, fromAddress: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.CMPB_BYTE_WITH_REG, 'CMPB', OperandType.REGISTER, OperandType.BYTE)
    private instrCMPB_BYTE_WITH_REG(toRegister: number, byte: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.JMP_REGADDRESS, 'JMP', OperandType.REGADDRESS)
    private instrJMP_REGADDRESS(toRegister: number, toOffset: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.JMP_ADDRESS, 'JMP', OperandType.WORD)
    private instrJMP_ADDRESS(toAddress: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.JC_REGADDRESS, 'JC', OperandType.REGADDRESS)
    private instrJC_REGADDRESS(toRegister: number, toOffset: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.JC_ADDRESS, 'JC', OperandType.WORD)
    private instrJC_ADDRESS(toAddress: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.JNC_REGADDRESS, 'JNC', OperandType.REGADDRESS)
    private instrJNC_REGADDRESS(toRegister: number, toOffset: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.JNC_ADDRESS, 'JNC', OperandType.WORD)
    private instrJNC_ADDRESS(toAddress: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.JZ_REGADDRESS, 'JZ', OperandType.REGADDRESS)
    private instrJZ_REGADDRESS(toRegister: number, toOffset: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.JZ_ADDRESS, 'JZ', OperandType.WORD)
    private instrJZ_ADDRESS(toAddress: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.JNZ_REGADDRESS, 'JNZ', OperandType.REGADDRESS)
    private instrJNZ_REGADDRESS(toRegister: number, toOffset: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.JNZ_ADDRESS, 'JNZ', OperandType.WORD)
    private instrJNZ_ADDRESS(toAddress: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.JA_REGADDRESS, 'JA', OperandType.REGADDRESS)
    private instrJA_REGADDRESS(toRegister: number, toOffset: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.JA_ADDRESS, 'JA', OperandType.WORD)
    private instrJA_ADDRESS(toAddress: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.JNA_REGADDRESS, 'JNA', OperandType.REGADDRESS)
    private instrJNA_REGADDRESS(toRegister: number, toOffset: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.JNA_ADDRESS, 'JNA', OperandType.WORD)
    private instrJNA_ADDRESS(toAddress: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.PUSH_REG, 'PUSH', OperandType.REGISTER)
    private instrPUSH_REG(toRegister: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.PUSH_REGADDRESS, 'PUSH', OperandType.REGADDRESS)
    private instrPUSH_REGADDRESS(toRegister: number, toOffset: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.PUSH_ADDRESS, 'PUSH', OperandType.ADDRESS)
    private instrPUSH_ADDRESS(toAddress: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.PUSH_WORD, 'PUSH', OperandType.WORD)
    private instrPUSH_WORD(word: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.PUSHB_REG, 'PUSHB', OperandType.REGISTER)
    private instrPUSHB_REG(toRegister: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.PUSHB_REGADDRESS, 'PUSHB', OperandType.REGADDRESS)
    private instrPUSHB_REGADDRESS(toRegister: number, toOffset: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.PUSHB_ADDRESS, 'PUSHB', OperandType.ADDRESS)
    private instrPUSHB_ADDRESS(toAddress: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.PUSHB_BYTE, 'PUSHB', OperandType.BYTE)
    private instrPUSHB_BYTE(byte: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.POP_REG, 'POP', OperandType.REGISTER)
    private instrPOP_REG(toRegister: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.POPB_REG, 'POPB', OperandType.REGISTER)
    private instrPOPB_REG(toRegister: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.CALL_REGADDRESS, 'CALL', OperandType.REGADDRESS)
    private instrCALL_REGADDRESS(toRegister: number, toOffset: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.CALL_ADDRESS, 'CALL', OperandType.WORD)
    private instrCALL_ADDRESS(toAddress: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.RET, 'RET')
    private instrRET(): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.MUL_REG, 'MUL', OperandType.REGISTER)
    private instrMUL_REG(toRegister: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.MUL_REGADDRESS, 'MUL', OperandType.REGADDRESS)
    private instrMUL_REGADDRESS(toRegister: number, toOffset: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.MUL_ADDRESS, 'MUL', OperandType.ADDRESS)
    private instrMUL_ADDRESS(toAddress: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.MUL_WORD, 'MUL', OperandType.WORD)
    private instrMUL_WORD(word: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.MULB_REGADDRESS, 'MULB', OperandType.REGADDRESS)
    private instrMULB_REGADDRESS(toRegister: number, toOffset: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.MULB_ADDRESS, 'MULB', OperandType.ADDRESS)
    private instrMULB_ADDRESS(toAddress: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.MULB_BYTE, 'MULB', OperandType.BYTE)
    private instrMULB_WORD(byte: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.DIV_REG, 'DIV', OperandType.REGISTER)
    private instrDIV_REG(toRegister: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.DIV_REGADDRESS, 'DIV', OperandType.REGADDRESS)
    private instrDIV_REGADDRESS(toRegister: number, toOffset: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.DIV_ADDRESS, 'DIV', OperandType.ADDRESS)
    private instrDIV_ADDRESS(toAddress: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.DIV_WORD, 'DIV', OperandType.WORD)
    private instrDIV_WORD(word: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.DIVB_REGADDRESS, 'DIVB', OperandType.REGADDRESS)
    private instrDIVB_REGADDRESS(toRegister: number, toOffset: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.DIVB_ADDRESS, 'DIVB', OperandType.ADDRESS)
    private instrDIVB_ADDRESS(toAddress: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.DIVB_BYTE, 'DIVB', OperandType.BYTE)
    private instrDIV_BYTE(byte: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.AND_REG_WITH_REG, 'AND', OperandType.REGISTER, OperandType.REGISTER)
    private instrAND_REG_WITH_REG(toRegister: number, fromRegister: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.AND_REGADDRESS_WITH_REG, 'AND', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrAND_REGADDRESS_WITH_REG(toRegister: number, fromRegister: number, fromOffset: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.AND_ADDRESS_WITH_REG, 'AND', OperandType.REGISTER, OperandType.ADDRESS)
    private instrAND_ADDRESS_WITH_REG(toRegister: number, fromAddress: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.AND_WORD_WITH_REG, 'AND', OperandType.REGISTER, OperandType.WORD)
    private instrAND_WORD_WITH_REG(toRegister: number, word: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.ANDB_REGADDRESS_WITH_REG, 'ANDB', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrANDB_REGADDRESS_WITH_REG(toRegister: number, fromRegister: number, fromOffset: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.ANDB_ADDRESS_WITH_REG, 'ANDB', OperandType.REGISTER, OperandType.ADDRESS)
    private instrANDB_ADDRESS_WITH_REG(toRegister: number, fromAddress: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.ANDB_BYTE_WITH_REG, 'ANDB', OperandType.REGISTER, OperandType.BYTE)
    private instrAND_BYTE_WITH_REG(toRegister: number, byte: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.OR_REG_WITH_REG, 'OR', OperandType.REGISTER, OperandType.REGISTER)
    private instrOR_REG_WITH_REG(toRegister: number, fromRegister: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.OR_REGADDRESS_WITH_REG, 'OR', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrOR_REGADDRESS_WITH_REG(toRegister: number, fromRegister: number, fromOffset: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.OR_ADDRESS_WITH_REG, 'OR', OperandType.REGISTER, OperandType.ADDRESS)
    private instrOR_ADDRESS_WITH_REG(toRegister: number, fromAddress: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.OR_WORD_WITH_REG, 'OR', OperandType.REGISTER, OperandType.WORD)
    private instrOR_WORD_WITH_REG(toRegister: number, word: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.ORB_REGADDRESS_WITH_REG, 'ORB', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrORB_REGADDRESS_WITH_REG(toRegister: number, fromRegister: number, fromOffset: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.ORB_ADDRESS_WITH_REG, 'ORB', OperandType.REGISTER, OperandType.ADDRESS)
    private instrORB_ADDRESS_WITH_REG(toRegister: number, fromAddress: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.ORB_BYTE_WITH_REG, 'ORB', OperandType.REGISTER, OperandType.BYTE)
    private instrORB_BYTE_WITH_REG(toRegister: number, byte: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.XOR_REG_WITH_REG, 'XOR', OperandType.REGISTER, OperandType.REGISTER)
    private instrXOR_REG_WITH_REG(toRegister: number, fromRegister: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.XOR_REGADDRESS_WITH_REG, 'XOR', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrXOR_REGADDRESS_WITH_REG(toRegister: number, fromRegister: number, fromOffset: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.XOR_ADDRESS_WITH_REG, 'XOR', OperandType.REGISTER, OperandType.ADDRESS)
    private instrXOR_ADDRESS_WITH_REG(toRegister: number, fromAddress: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.XOR_WORD_WITH_REG, 'XOR', OperandType.REGISTER, OperandType.WORD)
    private instrXOR_WORD_WITH_REG(toRegister: number, word: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.XORB_REGADDRESS_WITH_REG, 'XORB', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrXORB_REGADDRESS_WITH_REG(toRegister: number, fromRegister: number, fromOffset: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.XORB_ADDRESS_WITH_REG, 'XORB', OperandType.REGISTER, OperandType.ADDRESS)
    private instrXORB_ADDRESS_WITH_REG(toRegister: number, fromAddress: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.XORB_BYTE_WITH_REG, 'XORB', OperandType.REGISTER, OperandType.BYTE)
    private instrXORB_BYTE_WITH_REG(toRegister: number, byte: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.NOT_REG, 'NOT', OperandType.REGISTER)
    private instrNOT_REG(toRegister: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.SHL_REG_WITH_REG, 'SHL', OperandType.REGISTER, OperandType.REGISTER)
    private instrSHL_REG_WITH_REG(toRegister: number, fromRegister: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.SHL_REGADDRESS_WITH_REG, 'SHL', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrSHL_REGADDRESS_WITH_REG(toRegister: number, fromRegister: number, fromOffset: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.SHL_ADDRESS_WITH_REG, 'SHL', OperandType.REGISTER, OperandType.ADDRESS)
    private instrSHL_ADDRESS_WITH_REG(toRegister: number, fromAddress: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.SHL_WORD_WITH_REG, 'SHL', OperandType.REGISTER, OperandType.WORD)
    private instrSHL_WORD_WITH_REG(toRegister: number, word: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.SHLB_REGADDRESS_WITH_REG, 'SHLB', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrSHLB_REGADDRESS_WITH_REG(toRegister: number, fromRegister: number, fromOffset: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.SHLB_ADDRESS_WITH_REG, 'SHLB', OperandType.REGISTER, OperandType.ADDRESS)
    private instrSHLB_ADDRESS_WITH_REG(toRegister: number, fromAddress: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.SHLB_BYTE_WITH_REG, 'SHLB', OperandType.REGISTER, OperandType.BYTE)
    private instrSHLB_BYTE_WITH_REG(toRegister: number, byte: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.SHR_REG_WITH_REG, 'SHR', OperandType.REGISTER, OperandType.REGISTER)
    private instrSHR_REG_WITH_REG(toRegister: number, fromRegister: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.SHR_REGADDRESS_WITH_REG, 'SHR', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrSHR_REGADDRESS_WITH_REG(toRegister: number, fromRegister: number, fromOffset: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.SHR_ADDRESS_WITH_REG, 'SHR', OperandType.REGISTER, OperandType.ADDRESS)
    private instrSHR_ADDRESS_WITH_REG(toRegister: number, fromAddress: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.SHR_WORD_WITH_REG, 'SHR', OperandType.REGISTER, OperandType.WORD)
    private instrSHR_WORD_WITH_REG(toRegister: number, word: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.SHRB_REGADDRESS_WITH_REG, 'SHRB', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrSHRB_REGADDRESS_WITH_REG(toRegister: number, fromRegister: number, fromOffset: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.SHRB_ADDRESS_WITH_REG, 'SHRB', OperandType.REGISTER, OperandType.ADDRESS)
    private instrSHRB_ADDRESS_WITH_REG(toRegister: number, fromAddress: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.SHRB_BYTE_WITH_REG, 'SHRB', OperandType.REGISTER, OperandType.BYTE)
    private instrSHRB_BYTE_WITH_REG(toRegister: number, byte: number): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.CLI, 'CLI')
    private instrCLI(): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.STI, 'STI')
    private instrSTI(): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.IRET, 'IRET')
    private instrIRET(): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.SYSCALL, 'SYSCALL')
    private instrSYSCALL(): number | undefined {
        return undefined;
    }

    @Instruction(OpCode.SYSRET, 'SYSRET')
    private instrSYSRET(): number | undefined {
        return undefined;
    }

}
