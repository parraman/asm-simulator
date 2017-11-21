import { Injectable } from '@angular/core';

import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';

import { OpCode, OperandType, Instruction, instructionSet, InstructionSpec } from './instrset';
import { MemoryService } from './memory.service';
import { IORegMapService } from './ioregmap.service';
import {Exception, ExceptionType} from './exceptions';

import {
    CPURegisterIndex, CPURegister, CPUStatusRegister, CPURegisterOperation,
    CPUGeneralPurposeRegister, CPUStackPointerRegister
} from './cpuregs';


const IRQ_VECTOR_ADDRESS = 0x0003;
const SYSCALL_VECTOR_ADDRESS = 0x0006;
const EXCEPTION_VECTOR_ADDRESS = 0x0009;


@Injectable()
export class CPUService {

    protected registersBank: Map<CPURegisterIndex, CPURegister> = new Map<CPURegisterIndex, CPURegister>();

    protected cpuRegisterOperationSource = new Subject<CPURegisterOperation>();
    public cpuRegisterOperation$: Observable<CPURegisterOperation>;

    protected cpuConsumeTicksSource = new Subject<number>();
    public cpuConsumeTicks$: Observable<number>;

    protected nextIP = 0;

    protected userSP: CPURegister;
    protected supervisorSP: CPURegister;

    private interruptInput = 0;

    protected static is16bitsGPR(index: CPURegisterIndex): boolean {

        return (index === CPURegisterIndex.A ||
            index === CPURegisterIndex.B ||
            index === CPURegisterIndex.C ||
            index === CPURegisterIndex.D);

    }

    protected static is16bitsGPRorSP(index: CPURegisterIndex): boolean {

        return (CPUService.is16bitsGPR(index) || index === CPURegisterIndex.SP);

    }

    protected static is8bitsGPR(index: CPURegisterIndex): boolean {

        return (index === CPURegisterIndex.AH ||
            index === CPURegisterIndex.AL ||
            index === CPURegisterIndex.BH ||
            index === CPURegisterIndex.BL ||
            index === CPURegisterIndex.CH ||
            index === CPURegisterIndex.CL ||
            index === CPURegisterIndex.DH ||
            index === CPURegisterIndex.DL);

    }

    protected static getByteFrom8bitsGPR(index: CPURegisterIndex): string {

        let byte: string;

        switch (index) {
            case CPURegisterIndex.AH:
            case CPURegisterIndex.BH:
            case CPURegisterIndex.CH:
            case CPURegisterIndex.DH:
                byte = 'msb';
                break;
            case CPURegisterIndex.AL:
            case CPURegisterIndex.BL:
            case CPURegisterIndex.CL:
            case CPURegisterIndex.DL:
                byte = 'lsb';
                break;
        }
        return byte;

    }

    constructor(protected memoryService: MemoryService,
                protected ioRegMapService: IORegMapService) {

        const registerA = new CPUGeneralPurposeRegister('A', CPURegisterIndex.A, 0,
            this.cpuRegisterOperationSource, 'General Purpose Register A');
        this.registersBank.set(CPURegisterIndex.A, registerA);
        this.registersBank.set(CPURegisterIndex.AH, registerA);
        this.registersBank.set(CPURegisterIndex.AL, registerA);

        const registerB = new CPUGeneralPurposeRegister('B', CPURegisterIndex.B, 0,
            this.cpuRegisterOperationSource, 'General Purpose Register B');
        this.registersBank.set(CPURegisterIndex.B, registerB);
        this.registersBank.set(CPURegisterIndex.BH, registerB);
        this.registersBank.set(CPURegisterIndex.BL, registerB);

        const registerC = new CPUGeneralPurposeRegister('C', CPURegisterIndex.C, 0,
            this.cpuRegisterOperationSource, 'General Purpose Register C');
        this.registersBank.set(CPURegisterIndex.C, registerC);
        this.registersBank.set(CPURegisterIndex.CH, registerC);
        this.registersBank.set(CPURegisterIndex.CL, registerC);

        const registerD = new CPUGeneralPurposeRegister('D', CPURegisterIndex.D, 0,
            this.cpuRegisterOperationSource, 'General Purpose Register D');
        this.registersBank.set(CPURegisterIndex.D, registerD);
        this.registersBank.set(CPURegisterIndex.DH, registerD);
        this.registersBank.set(CPURegisterIndex.DL, registerD);

        this.userSP = new CPUStackPointerRegister('USP', CPURegisterIndex.USP, 0,
            this.cpuRegisterOperationSource, 'User Stack Pointer Register');
        this.supervisorSP = new CPUStackPointerRegister('SSP', CPURegisterIndex.SSP, 0,
            this.cpuRegisterOperationSource, 'Supervisor Stack Pointer Register');

        this.registersBank.set(CPURegisterIndex.SP, this.supervisorSP);
        this.registersBank.set(CPURegisterIndex.USP, this.userSP);
        this.registersBank.set(CPURegisterIndex.SSP, this.supervisorSP);

        this.registersBank.set(CPURegisterIndex.IP,
            new CPURegister('IP', CPURegisterIndex.IP, 0,
                this.cpuRegisterOperationSource, 'Instruction Pointer Register'));

        this.registersBank.set(CPURegisterIndex.SR,
            new CPUStatusRegister('SR', CPURegisterIndex.SR, 0x8000,
                this.cpuRegisterOperationSource, 'Status Register'));

        this.cpuRegisterOperation$ = this.cpuRegisterOperationSource.asObservable();
        this.cpuConsumeTicks$ = this.cpuConsumeTicksSource.asObservable();

    }

    protected divideBy(dividend: number, divisor: number) {

        if (divisor === 0) {
            throw new Exception(ExceptionType.DIVIDE_BY_ZERO,
                `Divide by zero error`, this.IP.value, this.SP.value);
        }

        return Math.floor(dividend / divisor);
    }

    public getRegistersBank(): Map<CPURegisterIndex, CPURegister> {

        return this.registersBank;

    }

    protected get SP(): CPUStackPointerRegister {
        return <CPUStackPointerRegister>this.registersBank.get(CPURegisterIndex.SP);
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
        this.SP.pushByte();

    }

    protected pushWord(value: number) {

        const currentSP = this.SP.value;
        this.memoryService.storeWord(currentSP - 1, value);
        this.SP.pushWord();

    }

    protected popByte(): number {

        const currentSP = this.SP.value;
        const value = this.memoryService.loadByte(currentSP + 1);
        this.SP.popByte();

        return value;

    }

    protected popWord(): number {

        const currentSP = this.SP.value;
        const value = this.memoryService.loadWord(currentSP + 1);
        this.SP.popWord();

        return value;

    }

    private toInterruptHandler() {

        const currentSR = this.SR.value;
        const currentIP = this.IP.value;
        const currentSP = this.SP.value;

        if ((currentSR & 0x8000) === 0) {
            /* We are coming from user mode */
            this.SR.supervisor = 1;
            this.registersBank.set(CPURegisterIndex.SP, this.supervisorSP);
        }

        this.pushWord(currentSR);
        this.pushWord(currentSP);
        this.pushWord(currentIP);

        this.IP.value = IRQ_VECTOR_ADDRESS;

        this.SR.irqMask = 0;

    }

    public raiseInterrupt() {

        if (this.SR.fault === 1) {

            throw Error('CPU in FAULT mode: reset required');

        }

        this.interruptInput = 1;

        this.SR.halt = 0;

        if (this.SR.irqMask === 1) {

            this.toInterruptHandler();

        }

    }

    public lowerInterrupt(): void {

        this.interruptInput = 0;

    }

    public reset(): void {

        this.registersBank.get(CPURegisterIndex.A).value = this.registersBank.get(CPURegisterIndex.A).resetValue;
        this.registersBank.get(CPURegisterIndex.B).value = this.registersBank.get(CPURegisterIndex.B).resetValue;
        this.registersBank.get(CPURegisterIndex.C).value = this.registersBank.get(CPURegisterIndex.C).resetValue;
        this.registersBank.get(CPURegisterIndex.D).value = this.registersBank.get(CPURegisterIndex.D).resetValue;
        this.registersBank.get(CPURegisterIndex.IP).value = this.registersBank.get(CPURegisterIndex.IP).resetValue;
        this.registersBank.get(CPURegisterIndex.SR).value = this.registersBank.get(CPURegisterIndex.SR).resetValue;

        this.userSP.value = this.userSP.resetValue;
        this.supervisorSP.value = this.supervisorSP.resetValue;
        this.registersBank.set(CPURegisterIndex.SP, this.supervisorSP);

        this.interruptInput = 0;

    }

    private fetchAndDecode(args: Array<number>): InstructionSpec {

        let opcode;

        try {
            opcode = this.memoryService.loadByte(this.nextIP);
        } catch (e) {
            throw new Exception(ExceptionType.INSTRUCTION_FETCH_ERROR,
                `Error when fetching instruction at ${this.nextIP}`, this.IP.value, this.SP.value);
        }
        this.nextIP += 1;

        const instruction = instructionSet.getInstructionFromOpCode(opcode);

        if (instruction === undefined) {
            throw new Exception(ExceptionType.UNKNOWN_OPCODE,
                `Invalid opcode: ${opcode}`, this.IP.value, this.SP.value);
        }

        let byte, word, register, regaddress, offset;

        switch (instruction.operand1) {

            case OperandType.BYTE:
                try {
                    byte = this.memoryService.loadByte(this.nextIP);
                } catch (e) {
                    throw new Exception(ExceptionType.INSTRUCTION_FETCH_ERROR,
                        `Error when fetching instruction at ${this.nextIP}`, this.IP.value, this.SP.value);
                }
                args.push(byte);
                this.nextIP += 1;
                break;
            case OperandType.REGISTER_8BITS:
            case OperandType.REGISTER_16BITS:
                try {
                    register = this.memoryService.loadByte(this.nextIP);
                } catch (e) {
                    throw new Exception(ExceptionType.INSTRUCTION_FETCH_ERROR,
                        `Error when fetching instruction at ${this.nextIP}`, this.IP.value, this.SP.value);
                }
                args.push(register);
                this.nextIP += 1;
                break;
            case OperandType.WORD:
            case OperandType.ADDRESS:
                try {
                    word = this.memoryService.loadWord(this.nextIP);
                } catch (e) {
                    throw new Exception(ExceptionType.INSTRUCTION_FETCH_ERROR,
                        `Error when fetching instruction at ${this.nextIP}`, this.IP.value, this.SP.value);
                }
                args.push(word);
                this.nextIP += 2;
                break;
            case OperandType.REGADDRESS:
                try {
                    regaddress = this.memoryService.loadWord(this.nextIP);
                } catch (e) {
                    throw new Exception(ExceptionType.INSTRUCTION_FETCH_ERROR,
                        `Error when fetching instruction at ${this.nextIP}`, this.IP.value, this.SP.value);
                }
                offset = (regaddress & 0xFF00) >>> 8;
                register = (regaddress & 0x00FF);
                if (offset > 127) {
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
                try {
                    byte = this.memoryService.loadByte(this.nextIP);
                } catch (e) {
                    throw new Exception(ExceptionType.INSTRUCTION_FETCH_ERROR,
                        `Error when fetching instruction at ${this.nextIP}`, this.IP.value, this.SP.value);
                }
                args.push(byte);
                this.nextIP += 1;
                break;
            case OperandType.REGISTER_8BITS:
            case OperandType.REGISTER_16BITS:
                try {
                    register = this.memoryService.loadByte(this.nextIP);
                } catch (e) {
                    throw new Exception(ExceptionType.INSTRUCTION_FETCH_ERROR,
                        `Error when fetching instruction at ${this.nextIP}`, this.IP.value, this.SP.value);
                }
                args.push(register);
                this.nextIP += 1;
                break;
            case OperandType.WORD:
            case OperandType.ADDRESS:
                try {
                    word = this.memoryService.loadWord(this.nextIP);
                } catch (e) {
                    throw new Exception(ExceptionType.INSTRUCTION_FETCH_ERROR,
                        `Error when fetching instruction at ${this.nextIP}`, this.IP.value, this.SP.value);
                }
                args.push(word);
                this.nextIP += 2;
                break;
            case OperandType.REGADDRESS:
                try {
                    regaddress = this.memoryService.loadWord(this.nextIP);
                } catch (e) {
                    throw new Exception(ExceptionType.INSTRUCTION_FETCH_ERROR,
                        `Error when fetching instruction at ${this.nextIP}`, this.IP.value, this.SP.value);
                }
                offset = (regaddress & 0xFF00) >>> 8;
                register = (regaddress & 0x00FF);
                if (offset > 127) {
                    offset = offset - 256;
                }
                args.push(register);
                args.push(offset);
                this.nextIP += 2;
                break;
        }

        return instruction;

    }

    public step(): void {

        if (this.SR.halt === 1) {

            this.cpuConsumeTicksSource.next(1);

            return;

        } else if (this.SR.fault === 1) {

            throw Error('CPU in FAULT mode: reset required');

        }

        this.nextIP = this.IP.value;

        try {

            const args: Array<number> = [];
            const instruction = this.fetchAndDecode(args);

            if (this[instruction.methodName].apply(this, args) === true) {
                this.IP.value = this.nextIP;
            }

            this.cpuConsumeTicksSource.next(1);

        } catch (e) {

            if (e instanceof Exception && this.SR.supervisor === 0) {

                this.SR.supervisor = 1;

                this.registersBank.set(CPURegisterIndex.SP, this.supervisorSP);

                try {

                    if (e.type === ExceptionType.MEMORY_ACCESS_ERROR) {
                        this.pushWord(e.memoryAddress);
                    }

                    this.pushWord(e.SP);
                    this.pushWord(e.IP);
                    this.pushWord(e.type);

                } catch (e) {
                    this.SR.fault = 1;
                    throw Error(`Exception occurred while creating the exception frame: ${e.message}`);
                }

                this.IP.value = EXCEPTION_VECTOR_ADDRESS;

            } else if (e instanceof Exception) {
                this.SR.fault = 1;
                throw Error(`Exception occurred while in supervisor mode: ${e.message}`);
            } else {
                this.SR.fault = 1;
                throw e;
            }
        }

    }

    @Instruction(OpCode.HLT, 'HLT')
    private instrHLT(): boolean {

        this.SR.halt = 1;

        return false;

    }

    @Instruction(OpCode.MOV_REG16_TO_REG16, 'MOV', OperandType.REGISTER_16BITS, OperandType.REGISTER_16BITS)
    private instrMOV_REG16_TO_REG16(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        this.registersBank.get(toRegister).value = this.registersBank.get(fromRegister).value;

        return true;

    }

    @Instruction(OpCode.MOV_ADDRESS_TO_REG16, 'MOV', OperandType.REGISTER_16BITS, OperandType.ADDRESS)
    private instrMOV_ADDRESS_TO_REG16(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        let word;

        try {
            word = this.memoryService.loadWord(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, fromAddress);
        }

        this.registersBank.get(toRegister).value = word;

        return true;

    }

    @Instruction(OpCode.MOV_REGADDRESS_TO_REG16, 'MOV', OperandType.REGISTER_16BITS, OperandType.REGADDRESS)
    private instrMOV_REGADDRESS_TO_REG16(toRegister: number, fromRegister: number, fromOffset): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const address = this.registersBank.get(fromRegister).value + fromOffset;

        this.registersBank.get(toRegister).value = this.memoryService.loadWord(address);

        return true;

    }

    @Instruction(OpCode.MOV_REG16_TO_ADDRESS, 'MOV', OperandType.ADDRESS, OperandType.REGISTER_16BITS)
    private instrMOV_REG16_TO_ADDRESS(toAddress: number, fromRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        try {
            this.memoryService.storeWord(toAddress, this.registersBank.get(fromRegister).value);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, toAddress);
        }

        return true;

    }

    @Instruction(OpCode.MOV_REG16_TO_REGADDRESS, 'MOV', OperandType.REGADDRESS, OperandType.REGISTER_16BITS)
    private instrMOV_REG16_TO_REGADDRESS(toRegister: number, toOffset: number, fromRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const address = this.registersBank.get(toRegister).value + toOffset;

        try {
            this.memoryService.storeWord(address, this.registersBank.get(fromRegister).value);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, address);
        }

        return true;

    }

    @Instruction(OpCode.MOV_WORD_TO_REG16, 'MOV', OperandType.REGISTER_16BITS, OperandType.WORD)
    private instrMOV_WORD_TO_REG16(toRegister: number, word: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        this.registersBank.get(toRegister).value = word;

        return true;
    }

    @Instruction(OpCode.MOV_WORD_TO_ADDRESS, 'MOV', OperandType.ADDRESS, OperandType.WORD)
    private instrMOV_WORD_TO_ADDRESS(toAddress: number, word: number): boolean {

        try {
            this.memoryService.storeWord(toAddress, word);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, toAddress);
        }

        return true;

    }

    @Instruction(OpCode.MOV_WORD_TO_REGADDRESS, 'MOV', OperandType.REGADDRESS, OperandType.WORD)
    private instrMOV_WORD_TO_REGADDRESS(toRegister: number, toOffset: number, word: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const address = this.registersBank.get(toRegister).value + toOffset;

        try {
            this.memoryService.storeWord(address, word);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, address);
        }

        return true;

    }

    @Instruction(OpCode.MOVB_REG8_TO_REG8, 'MOVB', OperandType.REGISTER_8BITS, OperandType.REGISTER_8BITS)
    private instrMOVB_REG8_TO_REG8(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is8bitsGPR(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);
        const byteFromRegister = CPUService.getByteFrom8bitsGPR(fromRegister);
        this.registersBank.get(toRegister)[byteToRegister] = this.registersBank.get(fromRegister)[byteFromRegister];

        return true;

    }

    @Instruction(OpCode.MOVB_ADDRESS_TO_REG8, 'MOVB', OperandType.REGISTER_8BITS, OperandType.ADDRESS)
    private instrMOVB_ADDRESS_TO_REG8(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, fromAddress);
        }

        this.registersBank.get(toRegister)[byteToRegister] = byte;

        return true;

    }

    @Instruction(OpCode.MOVB_REGADDRESS_TO_REG8, 'MOVB', OperandType.REGISTER_8BITS, OperandType.REGADDRESS)
    private instrMOVB_REGADDRESS_TO_REG8(toRegister: number, fromRegister: number, fromOffset: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const address = this.registersBank.get(fromRegister).value + fromOffset;
        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(address);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, address);
        }

        this.registersBank.get(toRegister)[byteToRegister] = byte;

        return true;

    }

    @Instruction(OpCode.MOVB_REG8_TO_ADDRESS, 'MOVB', OperandType.ADDRESS, OperandType.REGISTER_8BITS)
    private instrMOVB_REG8_TO_ADDRESS(toAddress: number, fromRegister: number): boolean {

        if (CPUService.is8bitsGPR(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteFromRegister = CPUService.getByteFrom8bitsGPR(fromRegister);

        try {
            this.memoryService.storeByte(toAddress, this.registersBank.get(fromRegister)[byteFromRegister]);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, toAddress);
        }

        return true;


    }

    @Instruction(OpCode.MOVB_REG8_TO_REGADDRESS, 'MOVB', OperandType.REGADDRESS, OperandType.REGISTER_8BITS)
    private instrMOVB_REG8_TO_REGADDRESS(toRegister: number, toOffset: number, fromRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        if (CPUService.is8bitsGPR(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const address = this.registersBank.get(toRegister).value + toOffset;
        const byteFromRegister = CPUService.getByteFrom8bitsGPR(fromRegister);

        try {
            this.memoryService.storeByte(address, this.registersBank.get(fromRegister)[byteFromRegister]);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, address);
        }

        return true;

    }

    @Instruction(OpCode.MOVB_BYTE_TO_REG8, 'MOVB', OperandType.REGISTER_8BITS, OperandType.BYTE)
    private instrMOVB_BYTE_TO_REG8(toRegister: number, byte: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        this.registersBank.get(toRegister)[byteToRegister] = byte;

        return true;

    }

    @Instruction(OpCode.MOVB_BYTE_TO_ADDRESS, 'MOVB', OperandType.ADDRESS, OperandType.BYTE)
    private instrMOVB_BYTE_TO_ADDRESS(toAddress: number, byte: number): boolean {

        try {
            this.memoryService.storeByte(toAddress, byte);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, toAddress);
        }

        return true;

    }

    @Instruction(OpCode.MOVB_BYTE_TO_REGADDRESS, 'MOVB', OperandType.REGADDRESS, OperandType.BYTE)
    private instrMOVB_BYTE_TO_REGADDRESS(toRegister: number, toOffset: number, byte: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const address = this.registersBank.get(toRegister).value + toOffset;

        try {
            this.memoryService.storeByte(address, byte);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, address);
        }

        return true;

    }

    @Instruction(OpCode.ADD_REG16_TO_REG16, 'ADD', OperandType.REGISTER_16BITS, OperandType.REGISTER_16BITS)
    private instrADD_REG16_TO_REG16(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        this.registersBank.get(toRegister).value =
            this.check16bitOperation(this.registersBank.get(toRegister).value +
                                     this.registersBank.get(fromRegister).value);

        return true;

    }

    @Instruction(OpCode.ADD_REGADDRESS_TO_REG16, 'ADD', OperandType.REGISTER_16BITS, OperandType.REGADDRESS)
    private instrADD_REGADDRESS_TO_REG16(toRegister: number, fromRegister: number, fromOffset: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const address = this.registersBank.get(fromRegister).value + fromOffset;

        let word;

        try {
            word = this.memoryService.loadWord(address);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, address);
        }

        this.registersBank.get(toRegister).value =
            this.check16bitOperation(this.registersBank.get(toRegister).value + word);

        return true;

    }

    @Instruction(OpCode.ADD_ADDRESS_TO_REG16, 'ADD', OperandType.REGISTER_16BITS, OperandType.ADDRESS)
    private instrADD_ADDRESS_TO_REG16(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        let word;

        try {
            word = this.memoryService.loadWord(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, fromAddress);
        }

        this.registersBank.get(toRegister).value =
            this.check16bitOperation(this.registersBank.get(toRegister).value + word);

        return true;

    }

    @Instruction(OpCode.ADD_WORD_TO_REG16, 'ADD', OperandType.REGISTER_16BITS, OperandType.WORD)
    private instrADD_WORD_TO_REG16(toRegister: number, word: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        this.registersBank.get(toRegister).value =
            this.check16bitOperation(this.registersBank.get(toRegister).value + word);

        return true;

    }

    @Instruction(OpCode.ADDB_REG8_TO_REG8, 'ADDB', OperandType.REGISTER_8BITS, OperandType.REGISTER_8BITS)
    private instrADDB_REG8_TO_REG8(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is8bitsGPR(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);
        const byteFromRegister = CPUService.getByteFrom8bitsGPR(fromRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] +
                this.registersBank.get(fromRegister)[byteFromRegister]);

        return true;

    }

    @Instruction(OpCode.ADDB_REGADDRESS_TO_REG8, 'ADDB', OperandType.REGISTER_8BITS, OperandType.REGADDRESS)
    private instrADDB_REGADDRESS_TO_REG8(toRegister: number, fromRegister: number, fromOffset: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const address = this.registersBank.get(fromRegister).value + fromOffset;
        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(address);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, address);
        }

        this.registersBank.get(toRegister)[byteToRegister] =
            this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] + byte);

        return true;

    }

    @Instruction(OpCode.ADDB_ADDRESS_TO_REG8, 'ADDB', OperandType.REGISTER_8BITS, OperandType.ADDRESS)
    private instrADDB_ADDRESS_TO_REG8(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(fromAddress) ;
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, fromAddress);
        }

        this.registersBank.get(toRegister)[byteToRegister] =
            this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] + byte);

        return true;

    }

    @Instruction(OpCode.ADDB_BYTE_TO_REG8, 'ADDB', OperandType.REGISTER_8BITS, OperandType.BYTE)
    private instrADDB_BYTE_TO_REG(toRegister: number, byte: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] + byte);

        return true;

    }

    @Instruction(OpCode.SUB_REG16_FROM_REG16, 'SUB', OperandType.REGISTER_16BITS, OperandType.REGISTER_16BITS)
    private instrSUB_REG16_FROM_REG16(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        this.registersBank.get(toRegister).value =
            this.check16bitOperation(this.registersBank.get(toRegister).value -
                                     this.registersBank.get(fromRegister).value);

        return true;

    }

    @Instruction(OpCode.SUB_REGADDRESS_FROM_REG16, 'SUB', OperandType.REGISTER_16BITS, OperandType.REGADDRESS)
    private instrSUB_REGADDRESS_FROM_REG16(toRegister: number, fromRegister: number, fromOffset: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const address = this.registersBank.get(fromRegister).value + fromOffset;

        let word;

        try {
            word = this.memoryService.loadWord(address);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, address);
        }

        this.registersBank.get(toRegister).value =
            this.check16bitOperation(this.registersBank.get(toRegister).value - word);

        return true;

    }

    @Instruction(OpCode.SUB_ADDRESS_FROM_REG16, 'SUB', OperandType.REGISTER_16BITS, OperandType.ADDRESS)
    private instrSUB_ADDRESS_FROM_REG16(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        let word;

        try {
            word = this.memoryService.loadWord(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, fromAddress);
        }

        this.registersBank.get(toRegister).value =
            this.check16bitOperation(this.registersBank.get(toRegister).value - word);

        return true;

    }

    @Instruction(OpCode.SUB_WORD_FROM_REG16, 'SUB', OperandType.REGISTER_16BITS, OperandType.WORD)
    private instrSUB_WORD_FROM_REG16(toRegister: number, word: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        this.registersBank.get(toRegister).value =
            this.check16bitOperation(this.registersBank.get(toRegister).value - word);

        return true;

    }

    @Instruction(OpCode.SUBB_REG8_FROM_REG8, 'SUBB', OperandType.REGISTER_8BITS, OperandType.REGISTER_8BITS)
    private instrSUBB_REG8_FROM_REG8(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is8bitsGPR(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);
        const byteFromRegister = CPUService.getByteFrom8bitsGPR(fromRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] -
                this.registersBank.get(fromRegister)[byteFromRegister]);

        return true;

    }

    @Instruction(OpCode.SUBB_REGADDRESS_FROM_REG8, 'SUBB', OperandType.REGISTER_8BITS, OperandType.REGADDRESS)
    private instrSUBB_REGADDRESS_FROM_REG8(toRegister: number, fromRegister: number, fromOffset: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const address = this.registersBank.get(fromRegister).value + fromOffset;
        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(address);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, address);
        }

        this.registersBank.get(toRegister)[byteToRegister] =
            this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] - byte);

        return true;

    }

    @Instruction(OpCode.SUBB_ADDRESS_FROM_REG8, 'SUBB', OperandType.REGISTER_8BITS, OperandType.ADDRESS)
    private instrSUBB_ADDRESS_FROM_REG8(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, fromAddress);
        }

        this.registersBank.get(toRegister)[byteToRegister] =
            this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] - byte);

        return true;

    }

    @Instruction(OpCode.SUBB_BYTE_FROM_REG8, 'SUBB', OperandType.REGISTER_8BITS, OperandType.BYTE)
    private instrSUBB_BYTE_FROM_REG8(toRegister: number, byte: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] - byte);

        return true;

    }

    @Instruction(OpCode.INC_REG16, 'INC', OperandType.REGISTER_16BITS)
    private instrINC_REG16(toRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        this.registersBank.get(toRegister).value =
            this.check16bitOperation(this.registersBank.get(toRegister).value + 1);

        return true;

    }

    @Instruction(OpCode.INCB_REG8, 'INCB', OperandType.REGISTER_8BITS)
    private instrINCB_REG8(toRegister: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] + 1);

        return true;

    }

    @Instruction(OpCode.DEC_REG16, 'DEC', OperandType.REGISTER_16BITS)
    private instrDEC_REG16(toRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        this.registersBank.get(toRegister).value =
            this.check16bitOperation(this.registersBank.get(toRegister).value - 1);

        return true;

    }

    @Instruction(OpCode.DECB_REG8, 'DECB', OperandType.REGISTER_8BITS)
    private instrDECB_REG8(toRegister: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] - 1);

        return true;

    }

    @Instruction(OpCode.CMP_REG16_WITH_REG16, 'CMP', OperandType.REGISTER_16BITS, OperandType.REGISTER_16BITS)
    private instrCMP_REG16_WITH_REG16(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        this.check16bitOperation(this.registersBank.get(toRegister).value -
            this.registersBank.get(fromRegister).value);

        return true;

    }

    @Instruction(OpCode.CMP_REGADDRESS_WITH_REG16, 'CMP', OperandType.REGISTER_16BITS, OperandType.REGADDRESS)
    private instrCMP_REGADDRESS_WITH_REG16(toRegister: number, fromRegister: number, fromOffset: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const address = this.registersBank.get(fromRegister).value + fromOffset;

        let word;

        try {
            word = this.memoryService.loadWord(address);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, address);
        }

        this.check16bitOperation(this.registersBank.get(toRegister).value - word);

        return true;

    }

    @Instruction(OpCode.CMP_ADDRESS_WITH_REG16, 'CMP', OperandType.REGISTER_16BITS, OperandType.ADDRESS)
    private instrCMP_ADDRESS_WITH_REG16(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        let word;

        try {
            word = this.memoryService.loadWord(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, fromAddress);
        }

        this.check16bitOperation(this.registersBank.get(toRegister).value - word);

        return true;

    }

    @Instruction(OpCode.CMP_WORD_WITH_REG16, 'CMP', OperandType.REGISTER_16BITS, OperandType.WORD)
    private instrCMP_WORD_WITH_REG16(toRegister: number, word: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        this.check16bitOperation(this.registersBank.get(toRegister).value - word);

        return true;

    }

    @Instruction(OpCode.CMPB_REG8_WITH_REG8, 'CMPB', OperandType.REGISTER_8BITS, OperandType.REGISTER_8BITS)
    private instrCMPB_REG8_WITH_REG8(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is8bitsGPR(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);
        const byteFromRegister = CPUService.getByteFrom8bitsGPR(fromRegister);

        this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] -
            this.registersBank.get(fromRegister)[byteFromRegister]);

        return true;

    }

    @Instruction(OpCode.CMPB_REGADDRESS_WITH_REG8, 'CMPB', OperandType.REGISTER_8BITS, OperandType.REGADDRESS)
    private instrCMPB_REGADDRESS_WITH_REG8(toRegister: number, fromRegister: number, fromOffset: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const address = this.registersBank.get(fromRegister).value + fromOffset;
        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(address);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, address);
        }

        this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] - byte);

        return true;

    }

    @Instruction(OpCode.CMPB_ADDRESS_WITH_REG8, 'CMPB', OperandType.REGISTER_8BITS, OperandType.ADDRESS)
    private instrCMPB_ADDRESS_WITH_REG8(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, fromAddress);
        }

        this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] - byte);

        return true;

    }

    @Instruction(OpCode.CMPB_BYTE_WITH_REG8, 'CMPB', OperandType.REGISTER_8BITS, OperandType.BYTE)
    private instrCMPB_BYTE_WITH_REG8(toRegister: number, byte: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] - byte);

        return true;

    }

    @Instruction(OpCode.JMP_REGADDRESS, 'JMP', OperandType.REGADDRESS)
    private instrJMP_REGADDRESS(toRegister: number, toOffset: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        this.IP.value = this.registersBank.get(toRegister).value + toOffset;

        return false;

    }

    @Instruction(OpCode.JMP_ADDRESS, 'JMP', OperandType.WORD)
    private instrJMP_ADDRESS(toAddress: number): boolean {

        this.IP.value = toAddress;

        return false;

    }

    @Instruction(OpCode.JC_REGADDRESS, 'JC', OperandType.REGADDRESS)
    private instrJC_REGADDRESS(toRegister: number, toOffset: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        if (this.SR.carry === 1) {
            this.IP.value = this.registersBank.get(toRegister).value + toOffset;
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

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        if (this.SR.carry === 0) {
            this.IP.value = this.registersBank.get(toRegister).value + toOffset;
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

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        if (this.SR.zero === 1) {
            this.IP.value = this.registersBank.get(toRegister).value + toOffset;
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

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        if (this.SR.zero === 0) {
            this.IP.value = this.registersBank.get(toRegister).value + toOffset;
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

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        if ((this.SR.carry === 0) && (this.SR.zero === 0)) {
            this.IP.value = this.registersBank.get(toRegister).value + toOffset;
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

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        if ((this.SR.carry === 1) || (this.SR.zero === 1)) {
            this.IP.value = this.registersBank.get(toRegister).value + toOffset;
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

    @Instruction(OpCode.PUSH_REG16, 'PUSH', OperandType.REGISTER_16BITS)
    private instrPUSH_REG16(toRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        try {
            this.pushWord(this.registersBank.get(toRegister).value);
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value);
        }

        return true;

    }

    @Instruction(OpCode.PUSH_REGADDRESS, 'PUSH', OperandType.REGADDRESS)
    private instrPUSH_REGADDRESS(toRegister: number, toOffset: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const address = this.registersBank.get(toRegister).value + toOffset;

        let word;

        try {
            word = this.memoryService.loadWord(address);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, address);
        }

        try {
            this.pushWord(word);
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value);
        }

        return true;

    }

    @Instruction(OpCode.PUSH_ADDRESS, 'PUSH', OperandType.ADDRESS)
    private instrPUSH_ADDRESS(toAddress: number): boolean {

        let word;

        try {
            word = this.memoryService.loadWord(toAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, toAddress);
        }

        try {
            this.pushWord(word);
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value);
        }

        return true;

    }

    @Instruction(OpCode.PUSH_WORD, 'PUSH', OperandType.WORD)
    private instrPUSH_WORD(word: number): boolean {

        try {
            this.pushWord(word);
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value);
        }

        return true;

    }

    @Instruction(OpCode.PUSHB_REG8, 'PUSHB', OperandType.REGISTER_8BITS)
    private instrPUSHB_REG8(toRegister: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        try {
            this.pushByte(this.registersBank.get(toRegister)[byteToRegister]);
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value);
        }

        return true;

    }

    @Instruction(OpCode.PUSHB_REGADDRESS, 'PUSHB', OperandType.REGADDRESS)
    private instrPUSHB_REGADDRESS(toRegister: number, toOffset: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const address = this.registersBank.get(toRegister).value + toOffset;

        let byte;

        try {
            byte = this.memoryService.loadByte(address);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, address);
        }

        try {
            this.pushByte(byte);
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value);
        }

        return true;

    }

    @Instruction(OpCode.PUSHB_ADDRESS, 'PUSHB', OperandType.ADDRESS)
    private instrPUSHB_ADDRESS(toAddress: number): boolean {

        let byte;

        try {
            byte = this.memoryService.loadByte(toAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, toAddress);
        }

        try {
            this.pushByte(byte);
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value);
        }

        return true;

    }

    @Instruction(OpCode.PUSHB_BYTE, 'PUSHB', OperandType.BYTE)
    private instrPUSHB_BYTE(byte: number): boolean {

        try {
            this.pushByte(byte);
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value);
        }

        return true;

    }

    @Instruction(OpCode.POP_REG16, 'POP', OperandType.REGISTER_16BITS)
    private instrPOP_REG16(toRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        let word;

        try {
            word = this.popWord();
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value);
        }

        this.registersBank.get(toRegister).value = word;

        return true;

    }

    @Instruction(OpCode.POPB_REG8, 'POPB', OperandType.REGISTER_8BITS)
    private instrPOPB_REG8(toRegister: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.popByte();
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value);
        }

        this.registersBank.get(toRegister)[byteToRegister] = byte;

        return true;

    }

    @Instruction(OpCode.CALL_REGADDRESS, 'CALL', OperandType.REGADDRESS)
    private instrCALL_REGADDRESS(toRegister: number, toOffset: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        try {
            this.pushWord(this.nextIP);
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value);
        }

        this.IP.value = this.registersBank.get(toRegister).value + toOffset;

        return false;

    }

    @Instruction(OpCode.CALL_ADDRESS, 'CALL', OperandType.WORD)
    private instrCALL_ADDRESS(toAddress: number): boolean {

        try {
            this.pushWord(this.nextIP);
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value);
        }

        this.IP.value = toAddress;

        return false;

    }

    @Instruction(OpCode.RET, 'RET')
    private instrRET(): boolean {

        let newIP;

        try {
            newIP = this.popWord();
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value);
        }

        this.IP.value = newIP;

        return false;

    }

    @Instruction(OpCode.MUL_REG16, 'MUL', OperandType.REGISTER_16BITS)
    private instrMUL_REG(toRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        this.registersBank.get(CPURegisterIndex.A).value =
            this.check16bitOperation(this.registersBank.get(CPURegisterIndex.A).value *
                                     this.registersBank.get(toRegister).value);

        return true;

    }

    @Instruction(OpCode.MUL_REGADDRESS, 'MUL', OperandType.REGADDRESS)
    private instrMUL_REGADDRESS(toRegister: number, toOffset: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const address = this.registersBank.get(toRegister).value + toOffset;

        let word;

        try {
            word = this.memoryService.loadWord(address);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, address);
        }

        this.registersBank.get(CPURegisterIndex.A).value =
            this.check16bitOperation(this.registersBank.get(CPURegisterIndex.A).value * word);

        return true;

    }

    @Instruction(OpCode.MUL_ADDRESS, 'MUL', OperandType.ADDRESS)
    private instrMUL_ADDRESS(toAddress: number): boolean {

        let word;

        try {
            word = this.memoryService.loadWord(toAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, toAddress);
        }

        this.registersBank.get(CPURegisterIndex.A).value =
            this.check16bitOperation(this.registersBank.get(CPURegisterIndex.A).value * word);

        return true;

    }

    @Instruction(OpCode.MUL_WORD, 'MUL', OperandType.WORD)
    private instrMUL_WORD(word: number): boolean {


        this.registersBank.get(CPURegisterIndex.A).value =
            this.check16bitOperation(this.registersBank.get(CPURegisterIndex.A).value *
                word);

        return true;

    }

    @Instruction(OpCode.MULB_REG8, 'MULB', OperandType.REGISTER_8BITS)
    private instrMULB_REG8(toRegister: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        this.registersBank.get(CPURegisterIndex.A)['lsb'] =
            this.check8bitOperation(this.registersBank.get(CPURegisterIndex.A)['lsb'] *
                this.registersBank.get(toRegister)[byteToRegister]);

        return true;

    }

    @Instruction(OpCode.MULB_REGADDRESS, 'MULB', OperandType.REGADDRESS)
    private instrMULB_REGADDRESS(toRegister: number, toOffset: number): boolean {


        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const address = this.registersBank.get(toRegister).value + toOffset;

        let byte;

        try {
            byte = this.memoryService.loadByte(address);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, address);
        }

        this.registersBank.get(CPURegisterIndex.A)['lsb'] =
            this.check8bitOperation(this.registersBank.get(CPURegisterIndex.A)['lsb'] * byte);

        return true;

    }

    @Instruction(OpCode.MULB_ADDRESS, 'MULB', OperandType.ADDRESS)
    private instrMULB_ADDRESS(toAddress: number): boolean {

        let byte;

        try {
            byte = this.memoryService.loadByte(toAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, toAddress);
        }

        this.registersBank.get(CPURegisterIndex.A)['lsb'] =
            this.check8bitOperation(this.registersBank.get(CPURegisterIndex.A)['lsb'] * byte);

        return true;

    }

    @Instruction(OpCode.MULB_BYTE, 'MULB', OperandType.BYTE)
    private instrMULB_WORD(byte: number): boolean {

        this.registersBank.get(CPURegisterIndex.A)['lsb'] =
            this.check8bitOperation(this.registersBank.get(CPURegisterIndex.A)['lsb'] *
                byte);

        return true;

    }

    @Instruction(OpCode.DIV_REG16, 'DIV', OperandType.REGISTER_16BITS)
    private instrDIV_REG16(toRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        this.registersBank.get(CPURegisterIndex.A).value =
            this.check16bitOperation(this.divideBy(this.registersBank.get(CPURegisterIndex.A).value,
                this.registersBank.get(toRegister).value));

        return true;

    }

    @Instruction(OpCode.DIV_REGADDRESS, 'DIV', OperandType.REGADDRESS)
    private instrDIV_REGADDRESS(toRegister: number, toOffset: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const address = this.registersBank.get(toRegister).value + toOffset;

        let word;

        try {
            word = this.memoryService.loadWord(address);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, address);
        }

        this.registersBank.get(CPURegisterIndex.A).value =
            this.check16bitOperation(this.divideBy(this.registersBank.get(CPURegisterIndex.A).value, word));

        return true;

    }

    @Instruction(OpCode.DIV_ADDRESS, 'DIV', OperandType.ADDRESS)
    private instrDIV_ADDRESS(toAddress: number): boolean {

        let word;

        try {
            word = this.memoryService.loadWord(toAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, toAddress);
        }

        this.registersBank.get(CPURegisterIndex.A).value =
            this.check16bitOperation(this.divideBy(this.registersBank.get(CPURegisterIndex.A).value, word));

        return true;

    }

    @Instruction(OpCode.DIV_WORD, 'DIV', OperandType.WORD)
    private instrDIV_WORD(word: number): boolean {

        this.registersBank.get(CPURegisterIndex.A).value =
            this.check16bitOperation(this.divideBy(this.registersBank.get(CPURegisterIndex.A).value, word));

        return true;

    }

    @Instruction(OpCode.DIVB_REG8, 'DIVB', OperandType.REGISTER_8BITS)
    private instrDIVB_REG8(toRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        this.registersBank.get(CPURegisterIndex.A)['lsb'] =
            this.check8bitOperation(this.divideBy(this.registersBank.get(CPURegisterIndex.A)['lsb'],
                this.registersBank.get(toRegister)[byteToRegister]));

        return true;

    }

    @Instruction(OpCode.DIVB_REGADDRESS, 'DIVB', OperandType.REGADDRESS)
    private instrDIVB_REGADDRESS(toRegister: number, toOffset: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const address = this.registersBank.get(toRegister).value + toOffset;

        let byte;

        try {
            byte = this.memoryService.loadByte(address);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, address);
        }

        this.registersBank.get(CPURegisterIndex.A)['lsb'] =
            this.check8bitOperation(this.divideBy(this.registersBank.get(CPURegisterIndex.A)['lsb'], byte));

        return true;

    }

    @Instruction(OpCode.DIVB_ADDRESS, 'DIVB', OperandType.ADDRESS)
    private instrDIVB_ADDRESS(toAddress: number): boolean {

        let byte;

        try {
            byte = this.memoryService.loadByte(toAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, toAddress);
        }

        this.registersBank.get(CPURegisterIndex.A)['lsb'] =
            this.check8bitOperation(this.divideBy(this.registersBank.get(CPURegisterIndex.A)['lsb'], byte));

        return true;

    }

    @Instruction(OpCode.DIVB_BYTE, 'DIVB', OperandType.BYTE)
    private instrDIV_BYTE(byte: number): boolean {

        this.registersBank.get(CPURegisterIndex.A)['lsb'] =
            this.check8bitOperation(this.divideBy(this.registersBank.get(CPURegisterIndex.A)['lsb'], byte));

        return true;

    }

    @Instruction(OpCode.AND_REG16_WITH_REG16, 'AND', OperandType.REGISTER_16BITS, OperandType.REGISTER_16BITS)
    private instrAND_REG16_WITH_REG16(toRegister: number, fromRegister: number): boolean {


        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        this.registersBank.get(toRegister).value =
            this.check16bitOperation(this.registersBank.get(toRegister).value &
                this.registersBank.get(fromRegister).value);

        return true;

    }

    @Instruction(OpCode.AND_REGADDRESS_WITH_REG16, 'AND', OperandType.REGISTER_16BITS, OperandType.REGADDRESS)
    private instrAND_REGADDRESS_WITH_REG16(toRegister: number, fromRegister: number, fromOffset: number): boolean {


        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const address = this.registersBank.get(fromRegister).value + fromOffset;

        let word;

        try {
            word = this.memoryService.loadWord(address);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, address);
        }

        this.registersBank.get(toRegister).value =
            this.check16bitOperation(this.registersBank.get(toRegister).value & word);

        return true;

    }

    @Instruction(OpCode.AND_ADDRESS_WITH_REG16, 'AND', OperandType.REGISTER_16BITS, OperandType.ADDRESS)
    private instrAND_ADDRESS_WITH_REG16(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        let word;

        try {
            word = this.memoryService.loadWord(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, fromAddress);
        }

        this.registersBank.get(toRegister).value =
            this.check16bitOperation(this.registersBank.get(toRegister).value & word);

        return true;

    }

    @Instruction(OpCode.AND_WORD_WITH_REG16, 'AND', OperandType.REGISTER_16BITS, OperandType.WORD)
    private instrAND_WORD_WITH_REG(toRegister: number, word: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        this.registersBank.get(toRegister).value =
            this.check16bitOperation(this.registersBank.get(toRegister).value & word);

        return true;

    }

    @Instruction(OpCode.ANDB_REG8_WITH_REG8, 'ANDB', OperandType.REGISTER_8BITS, OperandType.REGISTER_8BITS)
    private instrANDB_REG8_WITH_REG8(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is8bitsGPR(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);
        const byteFromRegister = CPUService.getByteFrom8bitsGPR(fromRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] &
                this.registersBank.get(fromRegister)[byteFromRegister]);

        return true;

    }

    @Instruction(OpCode.ANDB_REGADDRESS_WITH_REG8, 'ANDB', OperandType.REGISTER_8BITS, OperandType.REGADDRESS)
    private instrANDB_REGADDRESS_WITH_REG8(toRegister: number, fromRegister: number, fromOffset: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const address = this.registersBank.get(fromRegister).value + fromOffset;
        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(address);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, address);
        }

        this.registersBank.get(toRegister)[byteToRegister] =
            this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] & byte);

        return true;

    }

    @Instruction(OpCode.ANDB_ADDRESS_WITH_REG8, 'ANDB', OperandType.REGISTER_8BITS, OperandType.ADDRESS)
    private instrANDB_ADDRESS_WITH_REG8(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, fromAddress);
        }

        this.registersBank.get(toRegister)[byteToRegister] =
            this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] & byte);

        return true;

    }

    @Instruction(OpCode.ANDB_BYTE_WITH_REG8, 'ANDB', OperandType.REGISTER_8BITS, OperandType.BYTE)
    private instrAND_BYTE_WITH_REG8(toRegister: number, byte: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] & byte);

        return true;

    }

    @Instruction(OpCode.OR_REG16_WITH_REG16, 'OR', OperandType.REGISTER_16BITS, OperandType.REGISTER_16BITS)
    private instrOR_REG16_WITH_REG16(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        this.registersBank.get(toRegister).value =
            this.check16bitOperation(this.registersBank.get(toRegister).value |
                this.registersBank.get(fromRegister).value);

        return true;

    }

    @Instruction(OpCode.OR_REGADDRESS_WITH_REG16, 'OR', OperandType.REGISTER_16BITS, OperandType.REGADDRESS)
    private instrOR_REGADDRESS_WITH_REG16(toRegister: number, fromRegister: number, fromOffset: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const address = this.registersBank.get(fromRegister).value + fromOffset;

        let word;

        try {
            word = this.memoryService.loadWord(address);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, address);
        }

        this.registersBank.get(toRegister).value =
            this.check16bitOperation(this.registersBank.get(toRegister).value | word);

        return true;

    }

    @Instruction(OpCode.OR_ADDRESS_WITH_REG16, 'OR', OperandType.REGISTER_16BITS, OperandType.ADDRESS)
    private instrOR_ADDRESS_WITH_REG16(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        let word;

        try {
            word = this.memoryService.loadWord(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, fromAddress);
        }

        this.registersBank.get(toRegister).value =
            this.check16bitOperation(this.registersBank.get(toRegister).value | word);

        return true;

    }

    @Instruction(OpCode.OR_WORD_WITH_REG16, 'OR', OperandType.REGISTER_16BITS, OperandType.WORD)
    private instrOR_WORD_WITH_REG(toRegister: number, word: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        this.registersBank.get(toRegister).value =
            this.check16bitOperation(this.registersBank.get(toRegister).value | word);

        return true;

    }

    @Instruction(OpCode.ORB_REG8_WITH_REG8, 'ORB', OperandType.REGISTER_8BITS, OperandType.REGISTER_8BITS)
    private instrORB_REG8_WITH_REG8(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is8bitsGPR(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);
        const byteFromRegister = CPUService.getByteFrom8bitsGPR(fromRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] |
                this.registersBank.get(fromRegister)[byteFromRegister]);

        return true;

    }

    @Instruction(OpCode.ORB_REGADDRESS_WITH_REG8, 'ORB', OperandType.REGISTER_8BITS, OperandType.REGADDRESS)
    private instrORB_REGADDRESS_WITH_REG8(toRegister: number, fromRegister: number, fromOffset: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const address = this.registersBank.get(fromRegister).value + fromOffset;
        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(address);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, address);
        }

        this.registersBank.get(toRegister)[byteToRegister] =
            this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] | byte);

        return true;

    }

    @Instruction(OpCode.ORB_ADDRESS_WITH_REG8, 'ORB', OperandType.REGISTER_8BITS, OperandType.ADDRESS)
    private instrORB_ADDRESS_WITH_REG8(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, fromAddress);
        }

        this.registersBank.get(toRegister)[byteToRegister] =
            this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] | byte);

        return true;

    }

    @Instruction(OpCode.ORB_BYTE_WITH_REG8, 'ORB', OperandType.REGISTER_8BITS, OperandType.BYTE)
    private instrORB_BYTE_WITH_REG8(toRegister: number, byte: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] | byte);

        return true;

    }

    @Instruction(OpCode.XOR_REG16_WITH_REG16, 'XOR', OperandType.REGISTER_16BITS, OperandType.REGISTER_16BITS)
    private instrXOR_REG16_WITH_REG16(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        this.registersBank.get(toRegister).value =
            this.check16bitOperation(this.registersBank.get(toRegister).value ^
                this.registersBank.get(fromRegister).value);

        return true;

    }

    @Instruction(OpCode.XOR_REGADDRESS_WITH_REG16, 'XOR', OperandType.REGISTER_16BITS, OperandType.REGADDRESS)
    private instrXOR_REGADDRESS_WITH_REG16(toRegister: number, fromRegister: number, fromOffset: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const address = this.registersBank.get(fromRegister).value + fromOffset;

        let word;

        try {
            word = this.memoryService.loadWord(address);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, address);
        }

        this.registersBank.get(toRegister).value =
            this.check16bitOperation(this.registersBank.get(toRegister).value ^ word);

        return true;

    }

    @Instruction(OpCode.XOR_ADDRESS_WITH_REG16, 'XOR', OperandType.REGISTER_16BITS, OperandType.ADDRESS)
    private instrXOR_ADDRESS_WITH_REG16(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        let word;

        try {
            word = this.memoryService.loadWord(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, fromAddress);
        }

        this.registersBank.get(toRegister).value =
            this.check16bitOperation(this.registersBank.get(toRegister).value ^ word);

        return true;

    }

    @Instruction(OpCode.XOR_WORD_WITH_REG16, 'XOR', OperandType.REGISTER_16BITS, OperandType.WORD)
    private instrXOR_WORD_WITH_REG16(toRegister: number, word: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        this.registersBank.get(toRegister).value =
            this.check16bitOperation(this.registersBank.get(toRegister).value ^ word);

        return true;

    }

    @Instruction(OpCode.XORB_REG8_WITH_REG8, 'XORB', OperandType.REGISTER_8BITS, OperandType.REGISTER_8BITS)
    private instrXORB_REG8_WITH_REG8(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is8bitsGPR(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);
        const byteFromRegister = CPUService.getByteFrom8bitsGPR(fromRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] ^
                this.registersBank.get(fromRegister)[byteFromRegister]);

        return true;

    }

    @Instruction(OpCode.XORB_REGADDRESS_WITH_REG8, 'XORB', OperandType.REGISTER_8BITS, OperandType.REGADDRESS)
    private instrXORB_REGADDRESS_WITH_REG8(toRegister: number, fromRegister: number, fromOffset: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const address = this.registersBank.get(fromRegister).value + fromOffset;
        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(address);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, address);
        }

        this.registersBank.get(toRegister)[byteToRegister] =
            this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] ^ byte);

        return true;

    }

    @Instruction(OpCode.XORB_ADDRESS_WITH_REG8, 'XORB', OperandType.REGISTER_8BITS, OperandType.ADDRESS)
    private instrXORB_ADDRESS_WITH_REG8(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, fromAddress);
        }

        this.registersBank.get(toRegister)[byteToRegister] =
            this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] ^ byte);

        return true;

    }

    @Instruction(OpCode.XORB_BYTE_WITH_REG8, 'XORB', OperandType.REGISTER_8BITS, OperandType.BYTE)
    private instrXORB_BYTE_WITH_REG8(toRegister: number, byte: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] ^ byte);

        return true;

    }

    @Instruction(OpCode.NOT_REG16, 'NOT', OperandType.REGISTER_16BITS)
    private instrNOT_REG16(toRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        this.registersBank.get(toRegister).value =
            this.check16bitOperation(~this.registersBank.get(toRegister).value);

        return true;
    }

    @Instruction(OpCode.NOT_REG8, 'NOTB', OperandType.REGISTER_8BITS)
    private instrNOT_REG8(toRegister: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.check16bitOperation(~this.registersBank.get(toRegister)[byteToRegister]);

        return true;
    }

    @Instruction(OpCode.SHL_REG16_WITH_REG16, 'SHL', OperandType.REGISTER_16BITS, OperandType.REGISTER_16BITS)
    private instrSHL_REG_WITH_REG(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        this.registersBank.get(toRegister).value =
            this.check16bitOperation(this.registersBank.get(toRegister).value <<
                this.registersBank.get(fromRegister).value);

        return true;

    }

    @Instruction(OpCode.SHL_REGADDRESS_WITH_REG16, 'SHL', OperandType.REGISTER_16BITS, OperandType.REGADDRESS)
    private instrSHL_REGADDRESS_WITH_REG16(toRegister: number, fromRegister: number, fromOffset: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const address = this.registersBank.get(fromRegister).value + fromOffset;

        let word;

        try {
            word = this.memoryService.loadWord(address);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, address);
        }

        this.registersBank.get(toRegister).value =
            this.check16bitOperation(this.registersBank.get(toRegister).value << word);

        return true;

    }

    @Instruction(OpCode.SHL_ADDRESS_WITH_REG16, 'SHL', OperandType.REGISTER_16BITS, OperandType.ADDRESS)
    private instrSHL_ADDRESS_WITH_REG16(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        let word;

        try {
            word = this.memoryService.loadWord(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, fromAddress);
        }

        this.registersBank.get(toRegister).value =
            this.check16bitOperation(this.registersBank.get(toRegister).value << word);

        return true;

    }

    @Instruction(OpCode.SHL_WORD_WITH_REG16, 'SHL', OperandType.REGISTER_16BITS, OperandType.WORD)
    private instrSHL_WORD_WITH_REG16(toRegister: number, word: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        this.registersBank.get(toRegister).value =
            this.check16bitOperation(this.registersBank.get(toRegister).value << word);

        return true;

    }

    @Instruction(OpCode.SHLB_REG8_WITH_REG8, 'SHLB', OperandType.REGISTER_8BITS, OperandType.REGISTER_8BITS)
    private instrSHLB_REG8_WITH_REG8(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is8bitsGPR(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);
        const byteFromRegister = CPUService.getByteFrom8bitsGPR(fromRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] <<
                this.registersBank.get(fromRegister)[byteFromRegister]);

        return true;

    }

    @Instruction(OpCode.SHLB_REGADDRESS_WITH_REG8, 'SHLB', OperandType.REGISTER_16BITS, OperandType.REGADDRESS)
    private instrSHLB_REGADDRESS_WITH_REG8(toRegister: number, fromRegister: number, fromOffset: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const address = this.registersBank.get(fromRegister).value + fromOffset;
        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(address);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, address);
        }

        this.registersBank.get(toRegister)[byteToRegister] =
            this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] << byte);

        return true;

    }

    @Instruction(OpCode.SHLB_ADDRESS_WITH_REG8, 'SHLB', OperandType.REGISTER_8BITS, OperandType.ADDRESS)
    private instrSHLB_ADDRESS_WITH_REG8(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, fromAddress);
        }

        this.registersBank.get(toRegister)[byteToRegister] =
            this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] << byte);

        return true;

    }

    @Instruction(OpCode.SHLB_BYTE_WITH_REG8, 'SHLB', OperandType.REGISTER_8BITS, OperandType.BYTE)
    private instrSHLB_BYTE_WITH_REG8(toRegister: number, byte: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] << byte);

        return true;

    }

    @Instruction(OpCode.SHR_REG16_WITH_REG16, 'SHR', OperandType.REGISTER_16BITS, OperandType.REGISTER_16BITS)
    private instrSHR_REG_WITH_REG16(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        this.registersBank.get(toRegister).value =
            this.check16bitOperation(this.registersBank.get(toRegister).value >>>
                this.registersBank.get(fromRegister).value);

        return true;

    }

    @Instruction(OpCode.SHR_REGADDRESS_WITH_REG16, 'SHR', OperandType.REGISTER_16BITS, OperandType.REGADDRESS)
    private instrSHR_REGADDRESS_WITH_REG16(toRegister: number, fromRegister: number, fromOffset: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const address = this.registersBank.get(fromRegister).value + fromOffset;

        let word;

        try {
            word = this.memoryService.loadWord(address);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, address);
        }

        this.registersBank.get(toRegister).value =
            this.check16bitOperation(this.registersBank.get(toRegister).value >>> word);

        return true;

    }

    @Instruction(OpCode.SHR_ADDRESS_WITH_REG16, 'SHR', OperandType.REGISTER_16BITS, OperandType.ADDRESS)
    private instrSHR_ADDRESS_WITH_REG16(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        let word;

        try {
            word = this.memoryService.loadWord(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, fromAddress);
        }

        this.registersBank.get(toRegister).value =
            this.check16bitOperation(this.registersBank.get(toRegister).value >>> word);

        return true;

    }

    @Instruction(OpCode.SHR_WORD_WITH_REG16, 'SHR', OperandType.REGISTER_16BITS, OperandType.WORD)
    private instrSHR_WORD_WITH_REG16(toRegister: number, word: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        this.registersBank.get(toRegister).value =
            this.check16bitOperation(this.registersBank.get(toRegister).value >>> word);

        return true;

    }

    @Instruction(OpCode.SHRB_REG8_WITH_REG8, 'SHRB', OperandType.REGISTER_8BITS, OperandType.REGISTER_8BITS)
    private instrSHRB_REG8_WITH_REG8(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is8bitsGPR(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);
        const byteFromRegister = CPUService.getByteFrom8bitsGPR(fromRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] >>>
                this.registersBank.get(fromRegister)[byteFromRegister]);

        return true;

    }

    @Instruction(OpCode.SHRB_REGADDRESS_WITH_REG8, 'SHRB', OperandType.REGISTER_8BITS, OperandType.REGADDRESS)
    private instrSHRB_REGADDRESS_WITH_REG8(toRegister: number, fromRegister: number, fromOffset: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const address = this.registersBank.get(fromRegister).value + fromOffset;
        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(address);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, address);
        }

        this.registersBank.get(toRegister)[byteToRegister] =
            this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] >>> byte);

        return true;

    }

    @Instruction(OpCode.SHRB_ADDRESS_WITH_REG8, 'SHRB', OperandType.REGISTER_8BITS, OperandType.ADDRESS)
    private instrSHRB_ADDRESS_WITH_REG8(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, fromAddress);
        }

        this.registersBank.get(toRegister)[byteToRegister] =
            this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] >>> byte);

        return true;

    }

    @Instruction(OpCode.SHRB_BYTE_WITH_REG8, 'SHRB', OperandType.REGISTER_8BITS, OperandType.BYTE)
    private instrSHRB_BYTE_WITH_REG8(toRegister: number, byte: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.check8bitOperation(this.registersBank.get(toRegister)[byteToRegister] >>> byte);

        return true;

    }

    @Instruction(OpCode.CLI, 'CLI')
    private instrCLI(): boolean {

        if (this.SR.supervisor === 0) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION, `Invalid use of CLI when in user mode`,
                this.IP.value, this.SP.value);
        }

        this.SR.irqMask = 0;

        if (this.interruptInput === 1) {

            this.toInterruptHandler();

            return false;

        }

        return true;

    }

    @Instruction(OpCode.STI, 'STI')
    private instrSTI(): boolean {

        if (this.SR.supervisor === 0) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION, `Invalid use of STI when in user mode`,
                this.IP.value, this.SP.value);
        }

        this.SR.irqMask = 1;

        return true;

    }

    @Instruction(OpCode.IRET, 'IRET')
    private instrIRET(): boolean {

        if (this.SR.supervisor === 0) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION, `Invalid use of IRET when in user mode`,
                this.IP.value, this.SP.value);
        }

        let newIP, newSP, newSR;

        try {
            newIP = this.popWord();
            newSP = this.popWord();
            newSR = this.popWord();
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value);
        }

        this.IP.value = newIP;
        this.SR.value = newSR;

        if ((newSR & 0x8000) === 0) {
            /* We are going to go back to user mode */
            this.registersBank.set(CPURegisterIndex.SP, this.userSP);
            this.SP.value = newSP;
        }

        /* If we are going back to supervisor mode, there is no need for updating the SP */

        /* Oops! We are going back to handle another IRQ */

        if (this.SR.irqMask === 1 && this.interruptInput === 1) {

            this.toInterruptHandler();

        }

        return false;

    }

    @Instruction(OpCode.SVC, 'SVC')
    private instrSVC(): boolean {

        if (this.SR.supervisor === 1) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION, `Invalid use of SVC when in supervisor mode`,
                this.IP.value, this.SP.value);
        }

        this.SR.supervisor = 1;

        this.registersBank.set(CPURegisterIndex.SP, this.supervisorSP);

        try {
            this.pushWord(this.userSP.value);
            this.pushWord(this.nextIP);
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value);
        }

        this.IP.value = SYSCALL_VECTOR_ADDRESS;

        return false;

    }

    @Instruction(OpCode.SRET, 'SRET')
    private instrSRET(): boolean {

        if (this.SR.supervisor === 0) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid use of SRET when not in supervisor mode`, this.IP.value, this.SP.value);
        }

        let newIP, newSP;

        try {
            newIP = this.popWord();
            newSP = this.popWord();
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value);
        }

        this.SR.supervisor = 0;

        this.registersBank.set(CPURegisterIndex.SP, this.userSP);

        this.IP.value = newIP;
        this.SP.value = newSP;

        return false;

    }

    @Instruction(OpCode.IN_REG16, 'IN', OperandType.REGISTER_16BITS)
    private instrIN_REG16(toRegister: number) {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const register_address = this.registersBank.get(toRegister).value;
        this.registersBank.get(CPURegisterIndex.A).value =
            this.ioRegMapService.load(register_address);

        return true;

    }

    @Instruction(OpCode.IN_REGADDRESS, 'IN', OperandType.REGADDRESS)
    private instrIN_REGADDRESS(toRegister: number, toOffset: number) {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const address = this.registersBank.get(toRegister).value + toOffset;

        let register_address;

        try {
            register_address = this.memoryService.loadWord(address);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, address);
        }

        this.registersBank.get(CPURegisterIndex.A).value =
            this.ioRegMapService.load(register_address);

        return true;

    }

    @Instruction(OpCode.IN_ADDRESS, 'IN', OperandType.ADDRESS)
    private instrIN_ADDRESS(toAddress: number) {

        let register_address;

        try {
            register_address = this.memoryService.loadWord(toAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, toAddress);
        }

        this.registersBank.get(CPURegisterIndex.A).value =
            this.ioRegMapService.load(register_address);

        return true;

    }

    @Instruction(OpCode.IN_WORD, 'IN', OperandType.WORD)
    private instrIN_WORD(word: number) {

        this.registersBank.get(CPURegisterIndex.A).value =
            this.ioRegMapService.load(word);

        return true;

    }

    @Instruction(OpCode.OUT_REG16, 'OUT', OperandType.REGISTER_16BITS)
    private instrOUT_REG16(toRegister: number) {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const register_address = this.registersBank.get(toRegister).value;
        const value = this.registersBank.get(CPURegisterIndex.A).value;
        this.ioRegMapService.store(register_address, value);

        return true;

    }

    @Instruction(OpCode.OUT_REGADDRESS, 'OUT', OperandType.REGADDRESS)
    private instrOUT_REGADDRESS(toRegister: number, toOffset: number) {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value);
        }

        const address = this.registersBank.get(toRegister).value + toOffset;

        let register_address;

        try {
            register_address = this.memoryService.loadWord(address);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, address);
        }

        const value = this.registersBank.get(CPURegisterIndex.A).value;

        this.ioRegMapService.store(register_address, value);

        return true;

    }

    @Instruction(OpCode.OUT_ADDRESS, 'OUT', OperandType.ADDRESS)
    private instrOUT_ADDRESS(toAddress: number) {

        let register_address;

        try {
            register_address = this.memoryService.loadWord(toAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, toAddress);
        }

        const value = this.registersBank.get(CPURegisterIndex.A).value;

        this.ioRegMapService.store(register_address, value);

        return true;

    }

    @Instruction(OpCode.OUT_WORD, 'OUT', OperandType.WORD)
    private instrOUT_WORD(word: number) {

        const value = this.registersBank.get(CPURegisterIndex.A).value;

        this.ioRegMapService.store(word, value);

        return true;

    }

}
