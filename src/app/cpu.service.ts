import { Injectable } from '@angular/core';

import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';

import {OpCode, OperandType, Instruction, instructionSet} from './instrset';
import { MemoryService } from './memory.service';

import { CPURegisterIndex, CPURegister, CPUStatusRegister, CPURegisterOperation } from './cpuregs';


@Injectable()
export class CPUService {

    protected registersBank: Map<CPURegisterIndex, CPURegister> = new Map<CPURegisterIndex, CPURegister>();

    protected cpuRegisterOperationSource = new Subject<CPURegisterOperation>();

    public cpuRegisterOperation$: Observable<CPURegisterOperation>;

    protected nextIP = 0;

    protected static isGPR(index: number): boolean {

        return (index === CPURegisterIndex.A ||
            index === CPURegisterIndex.B ||
            index === CPURegisterIndex.C ||
            index === CPURegisterIndex.D);

    }

    protected static isGPRorSP(index: number): boolean {

        return (CPUService.isGPR(index) || index === CPURegisterIndex.SP);

    }

    constructor(protected memoryService: MemoryService) {

        this.registersBank.set(CPURegisterIndex.A,
            new CPURegister('A', CPURegisterIndex.A, 0,
                this.cpuRegisterOperationSource, 'General Purpose Register A'));
        this.registersBank.set(CPURegisterIndex.B,
            new CPURegister('B', CPURegisterIndex.B, 0,
                this.cpuRegisterOperationSource, 'General Purpose Register B'));
        this.registersBank.set(CPURegisterIndex.C,
            new CPURegister('C', CPURegisterIndex.C, 0,
                this.cpuRegisterOperationSource, 'General Purpose Register C'));
        this.registersBank.set(CPURegisterIndex.D,
            new CPURegister('D', CPURegisterIndex.D, 0,
                this.cpuRegisterOperationSource, 'General Purpose Register D'));
        this.registersBank.set(CPURegisterIndex.SP,
            new CPURegister('SP', CPURegisterIndex.SP, 0,
                this.cpuRegisterOperationSource, 'Stack Pointer Register'));
        this.registersBank.set(CPURegisterIndex.IP,
            new CPURegister('IP', CPURegisterIndex.IP, 0,
                this.cpuRegisterOperationSource, 'Instruction Pointer Register'));

        this.registersBank.set(CPURegisterIndex.SR,
            new CPUStatusRegister('SR', CPURegisterIndex.SR, 0x8000,
                this.cpuRegisterOperationSource, 'Status Register'));

        this.cpuRegisterOperation$ = this.cpuRegisterOperationSource.asObservable();

    }

    public getRegistersBank(): Map<CPURegisterIndex, CPURegister> {

        return this.registersBank;

    }

    protected get SP(): CPURegister {
        return this.registersBank.get(CPURegisterIndex.SP);
    }

    protected get IP(): CPURegister {
        return this.registersBank.get(CPURegisterIndex.IP);
    }

    protected get SR(): CPUStatusRegister {
        return <CPUStatusRegister>this.registersBank.get(CPURegisterIndex.SR);
    }

    protected check8bitOperation(value: number): number {

        this.SR.carry = 0;
        this.SR.zero = 0;

        if (value >= 256) {
            this.SR.carry = 1;
            value = value % 256;
        } else if (value === 0) {
            this.SR.zero = 1;
        } else if (value < 0) {
            this.SR.carry = 1;
            value = 256 - (-value) % 256;
        }

        return value;

    }

    protected check16bitOperation(value: number): number {

        this.SR.carry = 0;
        this.SR.zero = 0;

        if (value >= 65536) {
            this.SR.carry = 1;
            value = value % 65536;
        } else if (value === 0) {
            this.SR.zero = 1;
        } else if (value < 0) {
            this.SR.carry = 1;
            value = 65536 - (-value) % 65536;
        }

        return value;

    }

    protected pushByte(value: number) {

        const currentSP = this.SP.value;
        this.memoryService.storeByte(currentSP, value);
        this.SP.value -= currentSP - 1;

    }

    protected pushWord(value: number) {

        const currentSP = this.SP.value;
        this.memoryService.storeWord(currentSP - 1, value);
        this.SP.value -= currentSP - 2;

    }

    protected popByte(): number {

        const currentSP = this.SP.value;
        const value = this.memoryService.loadByte(currentSP + 1);
        this.SP.value -= currentSP + 1;

        return value;

    }

    protected popWord(): number {

        const currentSP = this.SP.value;
        const value = this.memoryService.loadWord(currentSP + 1);
        this.SP.value -= currentSP + 2;

        return value;

    }

    protected divide(divisor) {

        if (divisor === 0) {
            throw Error('Division by 0');
        }

        return Math.floor(this.registersBank[CPURegisterIndex.A].value / divisor);
    }

    public step() {

        if (this.SR.halt === 1) {

            return;

        } else if (this.SR.fault === 1) {

            throw Error('CPU in FAULT mode: reset required');

        }

        this.nextIP = this.IP.value;

        const opcode = this.memoryService.loadByte(this.nextIP);
        this.nextIP += 1;

        const instruction = instructionSet.getInstructionFromOpCode(opcode);

        if (instruction === undefined) {
            throw Error(`Invalid opcode: ${opcode}`);
        }

        const args: Array<number> = [];

        switch (instruction.operand1) {

            case OperandType.BYTE:
            case OperandType.REGISTER:
                const byte = this.memoryService.loadByte(this.nextIP);
                args.push(byte);
                this.nextIP += 1;
                break;
            case OperandType.WORD:
            case OperandType.ADDRESS:
                const word = this.memoryService.loadWord(this.nextIP);
                args.push(word);
                this.nextIP += 2;
                break;
            case OperandType.REGADDRESS:
                const regaddress = this.memoryService.loadWord(this.nextIP);
                let offset = (regaddress && 0xFF00) >>> 8;
                const register = (regaddress && 0x00FF);
                if ( offset > 127 ) {
                    offset = offset - 256;
                }
                args.push(register);
                args.push(offset);
                this.nextIP += 2;
                break;
            default:
                break;
        }

        switch (instruction.operand2) {

            case OperandType.BYTE:
            case OperandType.REGISTER:
                const byte = this.memoryService.loadByte(this.nextIP);
                args.push(byte);
                this.nextIP += 1;
                break;
            case OperandType.WORD:
            case OperandType.ADDRESS:
                const word = this.memoryService.loadWord(this.nextIP);
                args.push(word);
                this.nextIP += 2;
                break;
            case OperandType.REGADDRESS:
                const regaddress = this.memoryService.loadWord(this.nextIP);
                let offset = (regaddress && 0xFF00) >>> 8;
                const register = (regaddress && 0x00FF);
                if ( offset > 127 ) {
                    offset = offset - 256;
                }
                args.push(register);
                args.push(offset);
                this.nextIP += 2;
                break;
            default:
                break;
        }

        if (this[instruction.methodName].apply(this, args) === true) {
            this.IP.value = this.nextIP;
        }

    }

    @Instruction(OpCode.HLT, 'HLT')
    private instrHLT(): boolean {

        this.SR.halt = 1;

        return false;

    }

    @Instruction(OpCode.MOV_REG_TO_REG, 'MOV', OperandType.REGISTER, OperandType.REGISTER)
    private instrMOV_REG_TO_REG(toRegister: number, fromRegister: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }
        if (CPUService.isGPRorSP(fromRegister) === false) {
            throw Error(`Invalid second operand: register index ${fromRegister} out of bounds`);
        }

        this.registersBank.get(toRegister).value = this.registersBank.get(fromRegister).value;

        return true;

    }

    @Instruction(OpCode.MOV_ADDRESS_TO_REG, 'MOV', OperandType.REGISTER, OperandType.ADDRESS)
    private instrMOV_ADDRESS_TO_REG(toRegister: number, fromAddress: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        this.registersBank.get(toRegister).value = this.memoryService.loadWord(fromAddress);

        return true;

    }

    @Instruction(OpCode.MOV_REGADDRESS_TO_REG, 'MOV', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrMOV_REGADDRESS_TO_REG(toRegister: number, fromRegister: number, fromOffset): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }
        if (CPUService.isGPRorSP(fromRegister) === false) {
            throw Error(`Invalid second operand: register index ${fromRegister} out of bounds`);
        }

        const address = this.registersBank.get(fromRegister).value + fromOffset;

        this.registersBank.get(toRegister).value = this.memoryService.loadWord(address);

        return true;

    }

    @Instruction(OpCode.MOV_REG_TO_ADDRESS, 'MOV', OperandType.ADDRESS, OperandType.REGISTER)
    private instrMOV_REG_TO_ADDRESS(toAddress: number, fromRegister: number): boolean {

        if (CPUService.isGPRorSP(fromRegister) === false) {
            throw Error(`Invalid second operand: register index ${fromRegister} out of bounds`);
        }

        this.memoryService.storeWord(toAddress, this.registersBank.get(fromRegister).value);

        return true;

    }

    @Instruction(OpCode.MOV_REG_TO_REGADDRESS, 'MOV', OperandType.REGADDRESS, OperandType.REGISTER)
    private instrMOV_REG_TO_REGADDRESS(toRegister: number, toOffset: number, fromRegister: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        if (CPUService.isGPRorSP(fromRegister) === false) {
            throw Error(`Invalid second operand: register index ${fromRegister} out of bounds`);
        }

        const address = this.registersBank.get(toRegister).value + toOffset;

        this.memoryService.storeWord(address, this.registersBank.get(fromRegister).value);

        return true;

    }

    @Instruction(OpCode.MOV_WORD_TO_REG, 'MOV', OperandType.REGISTER, OperandType.WORD)
    private instrMOV_WORD_TO_REG(toRegister: number, word: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        this.registersBank.get(toRegister).value = word;

        return true;
    }

    @Instruction(OpCode.MOV_WORD_TO_ADDRESS, 'MOV', OperandType.ADDRESS, OperandType.WORD)
    private instrMOV_WORD_TO_ADDRESS(toAddress: number, word: number): boolean {

        this.memoryService.storeWord(toAddress, word);

        return true;

    }

    @Instruction(OpCode.MOV_WORD_TO_REGADDRESS, 'MOV', OperandType.REGADDRESS, OperandType.WORD)
    private instrMOV_WORD_TO_REGADDRESS(toRegister: number, toOffset: number, word: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        const address = this.registersBank.get(toRegister).value + toOffset;

        this.memoryService.storeWord(address, word);

        return true;

    }

    @Instruction(OpCode.MOVB_ADDRESS_TO_REG, 'MOVB', OperandType.REGISTER, OperandType.ADDRESS)
    private instrMOVB_ADDRESS_TO_REG(toRegister: number, fromAddress: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        this.registersBank.get(toRegister).lsb = this.memoryService.loadByte(fromAddress);

        return true;

    }

    @Instruction(OpCode.MOVB_REGADDRESS_TO_REG, 'MOVB', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrMOVB_REGADDRESS_TO_REG(toRegister: number, fromRegister: number, fromOffset: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }
        if (CPUService.isGPRorSP(fromRegister) === false) {
            throw Error(`Invalid second operand: register index ${fromRegister} out of bounds`);
        }

        const address = this.registersBank.get(fromRegister).value + fromOffset;

        this.registersBank.get(toRegister).lsb = this.memoryService.loadByte(address);

        return true;

    }

    @Instruction(OpCode.MOVB_REG_TO_ADDRESS, 'MOVB', OperandType.ADDRESS, OperandType.REGISTER)
    private instrMOVB_REG_TO_ADDRESS(toAddress: number, fromRegister: number): boolean {

        if (CPUService.isGPRorSP(fromRegister) === false) {
            throw Error(`Invalid second operand: register index ${fromRegister} out of bounds`);
        }

        this.memoryService.storeByte(toAddress, this.registersBank.get(fromRegister).lsb);

        return true;


    }

    @Instruction(OpCode.MOVB_REG_TO_REGADDRESS, 'MOVB', OperandType.REGADDRESS, OperandType.REGISTER)
    private instrMOVB_REG_TO_REGADDRESS(toRegister: number, toOffset: number, fromRegister: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        if (CPUService.isGPRorSP(fromRegister) === false) {
            throw Error(`Invalid second operand: register index ${fromRegister} out of bounds`);
        }

        const address = this.registersBank.get(toRegister).value + toOffset;

        this.memoryService.storeByte(address, this.registersBank.get(fromRegister).lsb);

        return true;

    }

    @Instruction(OpCode.MOVB_BYTE_TO_REG, 'MOVB', OperandType.REGISTER, OperandType.BYTE)
    private instrMOVB_BYTE_TO_REG(toRegister: number, byte: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        this.registersBank.get(toRegister).lsb = byte;

        return true;

    }

    @Instruction(OpCode.MOVB_BYTE_TO_ADDRESS, 'MOVB', OperandType.ADDRESS, OperandType.BYTE)
    private instrMOVB_BYTE_TO_ADDRESS(toAddress: number, byte: number): boolean {

        this.memoryService.storeByte(toAddress, byte);

        return true;

    }

    @Instruction(OpCode.MOVB_BYTE_TO_REGADDRESS, 'MOVB', OperandType.REGADDRESS, OperandType.BYTE)
    private instrMOVB_BYTE_TO_REGADDRESS(toRegister: number, toOffset: number, byte: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        const address = this.registersBank.get(toRegister).value + toOffset;

        this.memoryService.storeByte(address, byte);

        return true;

    }

    @Instruction(OpCode.ADD_REG_TO_REG, 'ADD', OperandType.REGISTER, OperandType.REGISTER)
    private instrADD_REG_TO_REG(toRegister: number, fromRegister: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }
        if (CPUService.isGPRorSP(fromRegister) === false) {
            throw Error(`Invalid second operand: register index ${fromRegister} out of bounds`);
        }

        this.registersBank.get(toRegister).value = 
            this.check16bitOperation(this.registersBank.get(toRegister).value +
                                     this.registersBank.get(fromRegister).value);

        return true;

    }

    @Instruction(OpCode.ADD_REGADDRESS_TO_REG, 'ADD', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrADD_REGADDRESS_TO_REG(toRegister: number, fromRegister: number, fromOffset: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }
        if (CPUService.isGPRorSP(fromRegister) === false) {
            throw Error(`Invalid second operand: register index ${fromRegister} out of bounds`);
        }

        const address = this.registersBank.get(fromRegister).value + fromOffset;

        this.registersBank.get(toRegister).value = 
            this.check16bitOperation(this.registersBank.get(toRegister).value +
                                     this.memoryService.loadWord(address));

        return true;

    }

    @Instruction(OpCode.ADD_ADDRESS_TO_REG, 'ADD', OperandType.REGISTER, OperandType.ADDRESS)
    private instrADD_ADDRESS_TO_REG(toRegister: number, fromAddress: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        this.registersBank.get(toRegister).value = 
            this.check16bitOperation(this.registersBank.get(toRegister).value +
                                     this.memoryService.loadWord(fromAddress));

        return true;

    }

    @Instruction(OpCode.ADD_WORD_TO_REG, 'ADD', OperandType.REGISTER, OperandType.WORD)
    private instrADD_WORD_TO_REG(toRegister: number, word: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        this.registersBank.get(toRegister).value = 
            this.check16bitOperation(this.registersBank.get(toRegister).value + word);

        return true;

    }

    @Instruction(OpCode.ADDB_REGADDRESS_TO_REG, 'ADDB', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrADDB_REGADDRESS_TO_REG(toRegister: number, fromRegister: number, fromOffset: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }
        if (CPUService.isGPRorSP(fromRegister) === false) {
            throw Error(`Invalid second operand: register index ${fromRegister} out of bounds`);
        }

        const address = this.registersBank.get(fromRegister).value + fromOffset;

        this.registersBank.get(toRegister).lsb = 
            this.check8bitOperation(this.registersBank.get(toRegister).lsb +
                                    this.memoryService.loadByte(address));

        return true;

    }

    @Instruction(OpCode.ADDB_ADDRESS_TO_REG, 'ADDB', OperandType.REGISTER, OperandType.ADDRESS)
    private instrADDB_ADDRESS_TO_REG(toRegister: number, fromAddress: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        this.registersBank.get(toRegister).lsb = 
            this.check8bitOperation(this.registersBank.get(toRegister).lsb +
                                this.memoryService.loadByte(fromAddress));

        return true;

    }

    @Instruction(OpCode.ADDB_BYTE_TO_REG, 'ADDB', OperandType.REGISTER, OperandType.BYTE)
    private instrADDB_BYTE_TO_REG(toRegister: number, byte: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        this.registersBank.get(toRegister).lsb = 
            this.check8bitOperation(this.registersBank.get(toRegister).lsb + byte);

        return true;

    }

    @Instruction(OpCode.SUB_REG_FROM_REG, 'SUB', OperandType.REGISTER, OperandType.REGISTER)
    private instrSUB_REG_FROM_REG(toRegister: number, fromRegister: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }
        if (CPUService.isGPRorSP(fromRegister) === false) {
            throw Error(`Invalid second operand: register index ${fromRegister} out of bounds`);
        }

        this.registersBank.get(toRegister).value = 
            this.check16bitOperation(this.registersBank.get(toRegister).value -
                                     this.registersBank.get(fromRegister).value);

        return true;

    }

    @Instruction(OpCode.SUB_REGADDRESS_FROM_REG, 'SUB', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrSUB_REGADDRESS_FROM_REG(toRegister: number, fromRegister: number, fromOffset: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }
        if (CPUService.isGPRorSP(fromRegister) === false) {
            throw Error(`Invalid second operand: register index ${fromRegister} out of bounds`);
        }

        const address = this.registersBank.get(fromRegister).value + fromOffset;

        this.registersBank.get(toRegister).value = 
            this.check16bitOperation(this.registersBank.get(toRegister).value -
                                     this.memoryService.loadWord(address));

        return true;

    }

    @Instruction(OpCode.SUB_ADDRESS_FROM_REG, 'SUB', OperandType.REGISTER, OperandType.ADDRESS)
    private instrSUB_ADDRESS_FROM_REG(toRegister: number, fromAddress: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        this.registersBank.get(toRegister).value = 
            this.check16bitOperation(this.registersBank.get(toRegister).value -
                                     this.memoryService.loadWord(fromAddress));

        return true;

    }

    @Instruction(OpCode.SUB_WORD_FROM_REG, 'SUB', OperandType.REGISTER, OperandType.WORD)
    private instrSUB_WORD_FROM_REG(toRegister: number, word: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        this.registersBank.get(toRegister).value = 
            this.check16bitOperation(this.registersBank.get(toRegister).value - word);

        return true;

    }

    @Instruction(OpCode.SUBB_REGADDRESS_FROM_REG, 'SUBB', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrSUBB_REGADDRESS_FROM_REG(toRegister: number, fromRegister: number, fromOffset: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }
        if (CPUService.isGPRorSP(fromRegister) === false) {
            throw Error(`Invalid second operand: register index ${fromRegister} out of bounds`);
        }

        const address = this.registersBank.get(fromRegister).value + fromOffset;

        this.registersBank.get(toRegister).lsb = 
            this.check8bitOperation(this.registersBank.get(toRegister).lsb -
                                    this.memoryService.loadByte(address));

        return true;

    }

    @Instruction(OpCode.SUBB_ADDRESS_FROM_REG, 'SUBB', OperandType.REGISTER, OperandType.ADDRESS)
    private instrSUBB_ADDRESS_FROM_REG(toRegister: number, fromAddress: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        this.registersBank.get(toRegister).lsb = 
            this.check8bitOperation(this.registersBank.get(toRegister).lsb -
                                this.memoryService.loadByte(fromAddress));

        return true;

    }

    @Instruction(OpCode.SUBB_BYTE_FROM_REG, 'SUBB', OperandType.REGISTER, OperandType.BYTE)
    private instrSUBB_BYTE_FROM_REG(toRegister: number, byte: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        this.registersBank.get(toRegister).lsb = 
            this.check8bitOperation(this.registersBank.get(toRegister).lsb + byte);

        return true;

    }

    @Instruction(OpCode.INC_REG, 'INC', OperandType.REGISTER)
    private instrINC_REG(toRegister: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        this.registersBank.get(toRegister).value = 
            this.check16bitOperation(this.registersBank.get(toRegister).value + 1);

        return true;

    }

    @Instruction(OpCode.DEC_REG, 'DEC', OperandType.REGISTER)
    private instrDEC_REG(toRegister: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        this.registersBank.get(toRegister).value = 
            this.check16bitOperation(this.registersBank.get(toRegister).value - 1);

        return true;

    }

    @Instruction(OpCode.CMP_REG_WITH_REG, 'CMP', OperandType.REGISTER, OperandType.REGISTER)
    private instrCMP_REG_WITH_REG(toRegister: number, fromRegister: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }
        if (CPUService.isGPRorSP(fromRegister) === false) {
            throw Error(`Invalid second operand: register index ${fromRegister} out of bounds`);
        }

        this.check16bitOperation(this.registersBank.get(toRegister).value -
            this.registersBank.get(fromRegister).value);

        return true;

    }

    @Instruction(OpCode.CMP_REGADDRESS_WITH_REG, 'CMP', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrCMP_REGADDRESS_WITH_REG(toRegister: number, fromRegister: number, fromOffset: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }
        if (CPUService.isGPRorSP(fromRegister) === false) {
            throw Error(`Invalid second operand: register index ${fromRegister} out of bounds`);
        }

        const address = this.registersBank.get(fromRegister).value + fromOffset;

        this.check16bitOperation(this.registersBank.get(toRegister).value -
            this.memoryService.loadWord(address));

        return true;

    }

    @Instruction(OpCode.CMP_ADDRESS_WITH_REG, 'CMP', OperandType.REGISTER, OperandType.ADDRESS)
    private instrCMP_ADDRESS_WITH_REG(toRegister: number, fromAddress: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        this.check16bitOperation(this.registersBank.get(toRegister).value -
            this.memoryService.loadWord(fromAddress));

        return true;

    }

    @Instruction(OpCode.CMP_WORD_WITH_REG, 'CMP', OperandType.REGISTER, OperandType.WORD)
    private instrCMP_WORD_WITH_REG(toRegister: number, word: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        this.check16bitOperation(this.registersBank.get(toRegister).value - word);

        return true;

    }

    @Instruction(OpCode.CMPB_REGADDRESS_WITH_REG, 'CMPB', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrCMPB_REGADDRESS_WITH_REG(toRegister: number, fromRegister: number, fromOffset: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }
        if (CPUService.isGPRorSP(fromRegister) === false) {
            throw Error(`Invalid second operand: register index ${fromRegister} out of bounds`);
        }

        const address = this.registersBank.get(fromRegister).value + fromOffset;

        this.check8bitOperation(this.registersBank.get(toRegister).lsb -
            this.memoryService.loadByte(address));

        return true;

    }

    @Instruction(OpCode.CMPB_ADDRESS_WITH_REG, 'CMPB', OperandType.REGISTER, OperandType.ADDRESS)
    private instrCMPB_ADDRESS_WITH_REG(toRegister: number, fromAddress: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        this.check8bitOperation(this.registersBank.get(toRegister).lsb -
            this.memoryService.loadByte(fromAddress));

        return true;

    }

    @Instruction(OpCode.CMPB_BYTE_WITH_REG, 'CMPB', OperandType.REGISTER, OperandType.BYTE)
    private instrCMPB_BYTE_WITH_REG(toRegister: number, byte: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        this.registersBank.get(toRegister).value = 
            this.check8bitOperation(this.registersBank.get(toRegister).lsb + byte);

        return true;

    }

    @Instruction(OpCode.JMP_REGADDRESS, 'JMP', OperandType.REGADDRESS)
    private instrJMP_REGADDRESS(toRegister: number, toOffset: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        const address = this.registersBank.get(toRegister).value + toOffset;

        this.IP.value = address;

        return false;

    }

    @Instruction(OpCode.JMP_ADDRESS, 'JMP', OperandType.WORD)
    private instrJMP_ADDRESS(toAddress: number): boolean {

        this.IP.value = toAddress;

        return false;

    }

    @Instruction(OpCode.JC_REGADDRESS, 'JC', OperandType.REGADDRESS)
    private instrJC_REGADDRESS(toRegister: number, toOffset: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        if (this.SR.carry === 1) {
            const address = this.registersBank.get(toRegister).value + toOffset;
            this.IP.value = address;
            return false;
        } else {
            return true;
        }

    }

    @Instruction(OpCode.JC_ADDRESS, 'JC', OperandType.WORD)
    private instrJC_ADDRESS(toAddress: number): boolean {

        if (this.SR.carry === 1) {
            this.IP.value = toAddress;
            return false;
        } else {
            return true;
        }

    }

    @Instruction(OpCode.JNC_REGADDRESS, 'JNC', OperandType.REGADDRESS)
    private instrJNC_REGADDRESS(toRegister: number, toOffset: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        if (this.SR.carry === 0) {
            const address = this.registersBank.get(toRegister).value + toOffset;
            this.IP.value = address;
            return false;
        } else {
            return true;
        }

    }

    @Instruction(OpCode.JNC_ADDRESS, 'JNC', OperandType.WORD)
    private instrJNC_ADDRESS(toAddress: number): boolean {

        if (this.SR.carry === 0) {
            this.IP.value = toAddress;
            return false;
        } else {
            return true;
        }

    }

    @Instruction(OpCode.JZ_REGADDRESS, 'JZ', OperandType.REGADDRESS)
    private instrJZ_REGADDRESS(toRegister: number, toOffset: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        if (this.SR.zero === 1) {
            const address = this.registersBank.get(toRegister).value + toOffset;
            this.IP.value = address;
            return false;
        } else {
            return true;
        }

    }

    @Instruction(OpCode.JZ_ADDRESS, 'JZ', OperandType.WORD)
    private instrJZ_ADDRESS(toAddress: number): boolean {

        if (this.SR.zero === 1) {
            this.IP.value = toAddress;
            return false;
        } else {
            return true;
        }

    }

    @Instruction(OpCode.JNZ_REGADDRESS, 'JNZ', OperandType.REGADDRESS)
    private instrJNZ_REGADDRESS(toRegister: number, toOffset: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        if (this.SR.zero === 0) {
            const address = this.registersBank.get(toRegister).value + toOffset;
            this.IP.value = address;
            return false;
        } else {
            return true;
        }

    }

    @Instruction(OpCode.JNZ_ADDRESS, 'JNZ', OperandType.WORD)
    private instrJNZ_ADDRESS(toAddress: number): boolean {

        if (this.SR.zero === 0) {
            this.IP.value = toAddress;
            return false;
        } else {
            return true;
        }

    }

    @Instruction(OpCode.JA_REGADDRESS, 'JA', OperandType.REGADDRESS)
    private instrJA_REGADDRESS(toRegister: number, toOffset: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        if ((this.SR.carry === 0) && (this.SR.zero === 0)) {
            const address = this.registersBank.get(toRegister).value + toOffset;
            this.IP.value = address;
            return false;
        } else {
            return true;
        }

    }

    @Instruction(OpCode.JA_ADDRESS, 'JA', OperandType.WORD)
    private instrJA_ADDRESS(toAddress: number): boolean {

        if ((this.SR.carry === 0) && (this.SR.zero === 0)) {
            this.IP.value = toAddress;
            return false;
        } else {
            return true;
        }

    }

    @Instruction(OpCode.JNA_REGADDRESS, 'JNA', OperandType.REGADDRESS)
    private instrJNA_REGADDRESS(toRegister: number, toOffset: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        if ((this.SR.carry === 1) || (this.SR.zero === 1)) {
            const address = this.registersBank.get(toRegister).value + toOffset;
            this.IP.value = address;
            return false;
        } else {
            return true;
        }

    }

    @Instruction(OpCode.JNA_ADDRESS, 'JNA', OperandType.WORD)
    private instrJNA_ADDRESS(toAddress: number): boolean {

        if ((this.SR.carry === 1) || (this.SR.zero === 1)) {
            this.IP.value = toAddress;
            return false;
        } else {
            return true;
        }

    }

    @Instruction(OpCode.PUSH_REG, 'PUSH', OperandType.REGISTER)
    private instrPUSH_REG(toRegister: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        this.pushWord(this.registersBank.get(toRegister).value);

        return true;

    }

    @Instruction(OpCode.PUSH_REGADDRESS, 'PUSH', OperandType.REGADDRESS)
    private instrPUSH_REGADDRESS(toRegister: number, toOffset: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        const address = this.registersBank.get(toRegister).value + toOffset;

        this.pushWord(this.memoryService.loadWord(address));

        return true;

    }

    @Instruction(OpCode.PUSH_ADDRESS, 'PUSH', OperandType.ADDRESS)
    private instrPUSH_ADDRESS(toAddress: number): boolean {

        this.pushWord(this.memoryService.loadWord(toAddress));

        return true;

    }

    @Instruction(OpCode.PUSH_WORD, 'PUSH', OperandType.WORD)
    private instrPUSH_WORD(word: number): boolean {

        this.pushWord(word);

        return true;

    }

    @Instruction(OpCode.PUSHB_REG, 'PUSHB', OperandType.REGISTER)
    private instrPUSHB_REG(toRegister: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        this.pushByte(this.registersBank.get(toRegister).lsb);

        return true;

    }

    @Instruction(OpCode.PUSHB_REGADDRESS, 'PUSHB', OperandType.REGADDRESS)
    private instrPUSHB_REGADDRESS(toRegister: number, toOffset: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        const address = this.registersBank.get(toRegister).value + toOffset;

        this.pushByte(this.memoryService.loadByte(address));

        return true;

    }

    @Instruction(OpCode.PUSHB_ADDRESS, 'PUSHB', OperandType.ADDRESS)
    private instrPUSHB_ADDRESS(toAddress: number): boolean {

        this.pushByte(this.memoryService.loadByte(toAddress));

        return true;

    }

    @Instruction(OpCode.PUSHB_BYTE, 'PUSHB', OperandType.BYTE)
    private instrPUSHB_BYTE(byte: number): boolean {

        this.pushByte(byte);

        return true;

    }

    @Instruction(OpCode.POP_REG, 'POP', OperandType.REGISTER)
    private instrPOP_REG(toRegister: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        this.registersBank.get(toRegister).value = this.popWord();

        return true;

    }

    @Instruction(OpCode.POPB_REG, 'POPB', OperandType.REGISTER)
    private instrPOPB_REG(toRegister: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        this.registersBank.get(toRegister).lsb = this.popByte();

        return true;

    }

    @Instruction(OpCode.CALL_REGADDRESS, 'CALL', OperandType.REGADDRESS)
    private instrCALL_REGADDRESS(toRegister: number, toOffset: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        this.pushWord(this.nextIP);

        const address = this.registersBank.get(toRegister).value + toOffset;
        this.IP.value = address;

        return false;

    }

    @Instruction(OpCode.CALL_ADDRESS, 'CALL', OperandType.WORD)
    private instrCALL_ADDRESS(toAddress: number): boolean {

        this.pushWord(this.nextIP);

        this.IP.value = toAddress;

        return false;

    }

    @Instruction(OpCode.RET, 'RET')
    private instrRET(): boolean {

        this.IP.value = this.popWord();

        return false;

    }

    @Instruction(OpCode.MUL_REG, 'MUL', OperandType.REGISTER)
    private instrMUL_REG(toRegister: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        this.registersBank.get(CPURegisterIndex.A).value = 
            this.check16bitOperation(this.registersBank.get(CPURegisterIndex.A).value *
                                     this.registersBank.get(toRegister).value);

        return true;

    }

    @Instruction(OpCode.MUL_REGADDRESS, 'MUL', OperandType.REGADDRESS)
    private instrMUL_REGADDRESS(toRegister: number, toOffset: number): boolean {

        if (CPUService.isGPRorSP(toRegister) === false) {
            throw Error(`Invalid first operand: register index ${toRegister} out of bounds`);
        }

        const address = this.registersBank.get(toRegister).value + toOffset;

        this.registersBank.get(toRegister).value = 
            this.check16bitOperation(this.registersBank.get(toRegister).value *
                                     this.memoryService.loadWord(address));

        return true;

    }

    @Instruction(OpCode.MUL_ADDRESS, 'MUL', OperandType.ADDRESS)
    private instrMUL_ADDRESS(toAddress: number): boolean {

    }

    @Instruction(OpCode.MUL_WORD, 'MUL', OperandType.WORD)
    private instrMUL_WORD(word: number): boolean {

    }

    @Instruction(OpCode.MULB_REGADDRESS, 'MULB', OperandType.REGADDRESS)
    private instrMULB_REGADDRESS(toRegister: number, toOffset: number): boolean {

    }

    @Instruction(OpCode.MULB_ADDRESS, 'MULB', OperandType.ADDRESS)
    private instrMULB_ADDRESS(toAddress: number): boolean {

    }

    @Instruction(OpCode.MULB_BYTE, 'MULB', OperandType.BYTE)
    private instrMULB_WORD(byte: number): boolean {

    }

    @Instruction(OpCode.DIV_REG, 'DIV', OperandType.REGISTER)
    private instrDIV_REG(toRegister: number): boolean {

    }

    @Instruction(OpCode.DIV_REGADDRESS, 'DIV', OperandType.REGADDRESS)
    private instrDIV_REGADDRESS(toRegister: number, toOffset: number): boolean {

    }

    @Instruction(OpCode.DIV_ADDRESS, 'DIV', OperandType.ADDRESS)
    private instrDIV_ADDRESS(toAddress: number): boolean {

    }

    @Instruction(OpCode.DIV_WORD, 'DIV', OperandType.WORD)
    private instrDIV_WORD(word: number): boolean {

    }

    @Instruction(OpCode.DIVB_REGADDRESS, 'DIVB', OperandType.REGADDRESS)
    private instrDIVB_REGADDRESS(toRegister: number, toOffset: number): boolean {

    }

    @Instruction(OpCode.DIVB_ADDRESS, 'DIVB', OperandType.ADDRESS)
    private instrDIVB_ADDRESS(toAddress: number): boolean {

    }

    @Instruction(OpCode.DIVB_BYTE, 'DIVB', OperandType.BYTE)
    private instrDIV_BYTE(byte: number): boolean {

    }

    @Instruction(OpCode.AND_REG_WITH_REG, 'AND', OperandType.REGISTER, OperandType.REGISTER)
    private instrAND_REG_WITH_REG(toRegister: number, fromRegister: number): boolean {

    }

    @Instruction(OpCode.AND_REGADDRESS_WITH_REG, 'AND', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrAND_REGADDRESS_WITH_REG(toRegister: number, fromRegister: number, fromOffset: number): boolean {

    }

    @Instruction(OpCode.AND_ADDRESS_WITH_REG, 'AND', OperandType.REGISTER, OperandType.ADDRESS)
    private instrAND_ADDRESS_WITH_REG(toRegister: number, fromAddress: number): boolean {

    }

    @Instruction(OpCode.AND_WORD_WITH_REG, 'AND', OperandType.REGISTER, OperandType.WORD)
    private instrAND_WORD_WITH_REG(toRegister: number, word: number): boolean {

    }

    @Instruction(OpCode.ANDB_REGADDRESS_WITH_REG, 'ANDB', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrANDB_REGADDRESS_WITH_REG(toRegister: number, fromRegister: number, fromOffset: number): boolean {

    }

    @Instruction(OpCode.ANDB_ADDRESS_WITH_REG, 'ANDB', OperandType.REGISTER, OperandType.ADDRESS)
    private instrANDB_ADDRESS_WITH_REG(toRegister: number, fromAddress: number): boolean {

    }

    @Instruction(OpCode.ANDB_BYTE_WITH_REG, 'ANDB', OperandType.REGISTER, OperandType.BYTE)
    private instrAND_BYTE_WITH_REG(toRegister: number, byte: number): boolean {

    }

    @Instruction(OpCode.OR_REG_WITH_REG, 'OR', OperandType.REGISTER, OperandType.REGISTER)
    private instrOR_REG_WITH_REG(toRegister: number, fromRegister: number): boolean {

    }

    @Instruction(OpCode.OR_REGADDRESS_WITH_REG, 'OR', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrOR_REGADDRESS_WITH_REG(toRegister: number, fromRegister: number, fromOffset: number): boolean {

    }

    @Instruction(OpCode.OR_ADDRESS_WITH_REG, 'OR', OperandType.REGISTER, OperandType.ADDRESS)
    private instrOR_ADDRESS_WITH_REG(toRegister: number, fromAddress: number): boolean {

    }

    @Instruction(OpCode.OR_WORD_WITH_REG, 'OR', OperandType.REGISTER, OperandType.WORD)
    private instrOR_WORD_WITH_REG(toRegister: number, word: number): boolean {

    }

    @Instruction(OpCode.ORB_REGADDRESS_WITH_REG, 'ORB', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrORB_REGADDRESS_WITH_REG(toRegister: number, fromRegister: number, fromOffset: number): boolean {

    }

    @Instruction(OpCode.ORB_ADDRESS_WITH_REG, 'ORB', OperandType.REGISTER, OperandType.ADDRESS)
    private instrORB_ADDRESS_WITH_REG(toRegister: number, fromAddress: number): boolean {

    }

    @Instruction(OpCode.ORB_BYTE_WITH_REG, 'ORB', OperandType.REGISTER, OperandType.BYTE)
    private instrORB_BYTE_WITH_REG(toRegister: number, byte: number): boolean {

    }

    @Instruction(OpCode.XOR_REG_WITH_REG, 'XOR', OperandType.REGISTER, OperandType.REGISTER)
    private instrXOR_REG_WITH_REG(toRegister: number, fromRegister: number): boolean {

    }

    @Instruction(OpCode.XOR_REGADDRESS_WITH_REG, 'XOR', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrXOR_REGADDRESS_WITH_REG(toRegister: number, fromRegister: number, fromOffset: number): boolean {

    }

    @Instruction(OpCode.XOR_ADDRESS_WITH_REG, 'XOR', OperandType.REGISTER, OperandType.ADDRESS)
    private instrXOR_ADDRESS_WITH_REG(toRegister: number, fromAddress: number): boolean {

    }

    @Instruction(OpCode.XOR_WORD_WITH_REG, 'XOR', OperandType.REGISTER, OperandType.WORD)
    private instrXOR_WORD_WITH_REG(toRegister: number, word: number): boolean {

    }

    @Instruction(OpCode.XORB_REGADDRESS_WITH_REG, 'XORB', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrXORB_REGADDRESS_WITH_REG(toRegister: number, fromRegister: number, fromOffset: number): boolean {

    }

    @Instruction(OpCode.XORB_ADDRESS_WITH_REG, 'XORB', OperandType.REGISTER, OperandType.ADDRESS)
    private instrXORB_ADDRESS_WITH_REG(toRegister: number, fromAddress: number): boolean {

    }

    @Instruction(OpCode.XORB_BYTE_WITH_REG, 'XORB', OperandType.REGISTER, OperandType.BYTE)
    private instrXORB_BYTE_WITH_REG(toRegister: number, byte: number): boolean {

    }

    @Instruction(OpCode.NOT_REG, 'NOT', OperandType.REGISTER)
    private instrNOT_REG(toRegister: number): boolean {

    }

    @Instruction(OpCode.SHL_REG_WITH_REG, 'SHL', OperandType.REGISTER, OperandType.REGISTER)
    private instrSHL_REG_WITH_REG(toRegister: number, fromRegister: number): boolean {

    }

    @Instruction(OpCode.SHL_REGADDRESS_WITH_REG, 'SHL', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrSHL_REGADDRESS_WITH_REG(toRegister: number, fromRegister: number, fromOffset: number): boolean {

    }

    @Instruction(OpCode.SHL_ADDRESS_WITH_REG, 'SHL', OperandType.REGISTER, OperandType.ADDRESS)
    private instrSHL_ADDRESS_WITH_REG(toRegister: number, fromAddress: number): boolean {

    }

    @Instruction(OpCode.SHL_WORD_WITH_REG, 'SHL', OperandType.REGISTER, OperandType.WORD)
    private instrSHL_WORD_WITH_REG(toRegister: number, word: number): boolean {

    }

    @Instruction(OpCode.SHLB_REGADDRESS_WITH_REG, 'SHLB', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrSHLB_REGADDRESS_WITH_REG(toRegister: number, fromRegister: number, fromOffset: number): boolean {

    }

    @Instruction(OpCode.SHLB_ADDRESS_WITH_REG, 'SHLB', OperandType.REGISTER, OperandType.ADDRESS)
    private instrSHLB_ADDRESS_WITH_REG(toRegister: number, fromAddress: number): boolean {

    }

    @Instruction(OpCode.SHLB_BYTE_WITH_REG, 'SHLB', OperandType.REGISTER, OperandType.BYTE)
    private instrSHLB_BYTE_WITH_REG(toRegister: number, byte: number): boolean {

    }

    @Instruction(OpCode.SHR_REG_WITH_REG, 'SHR', OperandType.REGISTER, OperandType.REGISTER)
    private instrSHR_REG_WITH_REG(toRegister: number, fromRegister: number): boolean {

    }

    @Instruction(OpCode.SHR_REGADDRESS_WITH_REG, 'SHR', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrSHR_REGADDRESS_WITH_REG(toRegister: number, fromRegister: number, fromOffset: number): boolean {

    }

    @Instruction(OpCode.SHR_ADDRESS_WITH_REG, 'SHR', OperandType.REGISTER, OperandType.ADDRESS)
    private instrSHR_ADDRESS_WITH_REG(toRegister: number, fromAddress: number): boolean {

    }

    @Instruction(OpCode.SHR_WORD_WITH_REG, 'SHR', OperandType.REGISTER, OperandType.WORD)
    private instrSHR_WORD_WITH_REG(toRegister: number, word: number): boolean {

    }

    @Instruction(OpCode.SHRB_REGADDRESS_WITH_REG, 'SHRB', OperandType.REGISTER, OperandType.REGADDRESS)
    private instrSHRB_REGADDRESS_WITH_REG(toRegister: number, fromRegister: number, fromOffset: number): boolean {

    }

    @Instruction(OpCode.SHRB_ADDRESS_WITH_REG, 'SHRB', OperandType.REGISTER, OperandType.ADDRESS)
    private instrSHRB_ADDRESS_WITH_REG(toRegister: number, fromAddress: number): boolean {

    }

    @Instruction(OpCode.SHRB_BYTE_WITH_REG, 'SHRB', OperandType.REGISTER, OperandType.BYTE)
    private instrSHRB_BYTE_WITH_REG(toRegister: number, byte: number): boolean {

    }

    @Instruction(OpCode.CLI, 'CLI')
    private instrCLI(): boolean {

    }

    @Instruction(OpCode.STI, 'STI')
    private instrSTI(): boolean {

    }

    @Instruction(OpCode.IRET, 'IRET')
    private instrIRET(): boolean {

    }

    @Instruction(OpCode.SYSCALL, 'SYSCALL')
    private instrSYSCALL(): boolean {

    }

    @Instruction(OpCode.SYSRET, 'SYSRET')
    private instrSYSRET(): boolean {

    }

}
