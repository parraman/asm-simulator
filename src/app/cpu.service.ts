import { Injectable } from '@angular/core';

import { Subject, Observable, Subscription } from 'rxjs';

import { OpCode, OperandType, Instruction, instructionSet, InstructionSpec } from './instrset';
import { MemoryService, MemoryAccessActor } from './memory.service';
import { IORegMapService } from './ioregmap.service';
import { ClockService} from './clock.service';
import { Exception, ExceptionType } from './exceptions';

import { Utils } from './utils';
import { EventsLogService, SystemEvent } from './events-log.service';

import {
    CPURegisterIndex, CPURegister, CPUStatusRegister, CPURegisterOperation,
    CPUGeneralPurposeRegister, SRBit, CPURegisterOperationType,
    CPURegisterRegularOpParams, CPURegisterBitOpParams
} from './cpuregs';

import { ArithmeticLogicUnit, ALUOperation } from './alu';


const IRQ_VECTOR_ADDRESS = 0x0003;
const SYSCALL_VECTOR_ADDRESS = 0x0006;
const EXCEPTION_VECTOR_ADDRESS = 0x0009;

export enum ControlUnitOperationType {

    RESET = 0,
    FETCH_OPCODE = 1,
    DECODE = 2,
    FETCH_OPERANDS = 3,
    RESOLVE_REGADDRESS = 4,
    EXECUTE = 5,
    CPU_FAULT = 6,
    HALTED = 7,
    WAKE_UP = 8,
    IRQ_RAISE_LEVEL = 9,
    IRQ_LOWER_LEVEL = 10

}

export interface CUOperationParamsFetchOpCode {

    address: number;

}

export interface CUOperationParamsDecode {

    opcode: number;

}

export interface CUOperationParamsFetchOperands {

    opcode: number;
    address: number;
    operand1Type: OperandType;
    operand2Type: OperandType;

}

export interface CUOperationParamsResolveRegAddress {

    register: number;
    offset: number;

}

export interface CUOperationParamsExecute {

    opcode: number;
    operand1Type: OperandType;
    operand1Value: number;
    operand2Type: OperandType;
    operand2Value: number;

}

type ControlUnitOperationParams = CUOperationParamsFetchOpCode | CUOperationParamsDecode |
    CUOperationParamsFetchOperands | CUOperationParamsResolveRegAddress |
    CUOperationParamsExecute;

enum ControlUnitOperationState {

    IN_PROGRESS = 0,
    FINISHED = 1

}

export class ControlUnitOperation implements SystemEvent {

    public operationType: ControlUnitOperationType;
    public data: ControlUnitOperationParams;
    public state: ControlUnitOperationState;

    constructor(operationType: ControlUnitOperationType, data?: ControlUnitOperationParams,
                state?: ControlUnitOperationState) {

        this.operationType = operationType;
        this.data = data;
        this.state = state;

    }

    toString(): string {

        let ret, params;

        switch (this.operationType) {
            case ControlUnitOperationType.RESET:
                ret = `CU: Reset control unit`;
                break;
            case ControlUnitOperationType.FETCH_OPCODE:
                params = <CUOperationParamsFetchOpCode>this.data;
                ret = `CU: Fetch opcode from [0x${Utils.pad(params.address, 16, 4)}]`;
                break;
            case ControlUnitOperationType.DECODE:
                params = <CUOperationParamsDecode>this.data;
                ret = `CU: Decode opcode 0x${Utils.pad(params.opcode, 16, 2)}`;
                break;
            case ControlUnitOperationType.FETCH_OPERANDS:
                params = <CUOperationParamsFetchOperands>this.data;
                if (params.operand1Type === undefined && params.operand2Type === undefined) {
                    ret = `CU: Instruction {0x${Utils.pad(params.opcode, 16, 2)}: ${OpCode[params.opcode]}} has no operands`;
                } else if (params.operand2Type === undefined) {
                    ret = `CU: Fetch operand ${OperandType[params.operand1Type]} from address [0x${Utils.pad(params.address, 16, 4)}]`;
                } else {
                    ret = `CU: Fetch operands (${OperandType[params.operand1Type]}, ` +
                          `${OperandType[params.operand2Type]}) from address [0x${Utils.pad(params.address, 16, 4)}]`;
                }
                break;
            case ControlUnitOperationType.RESOLVE_REGADDRESS:
                params = <CUOperationParamsResolveRegAddress>this.data;
                ret = `CU: Resolve indirect address [${CPURegisterIndex[params.register]}`;
                ret += (params.offset >= 0) ? `+${params.offset}]` : `${params.offset}]`;
                break;
            case ControlUnitOperationType.EXECUTE:
                params = <CUOperationParamsExecute>this.data;
                ret = `CU: Execute instruction {0x${Utils.pad(params.opcode, 16, 2)}: ${OpCode[params.opcode]}}`;

                if (params.operand1Type !== undefined) {

                    if (params.operand1Type === OperandType.BYTE) {
                        ret += ` (0x${Utils.pad(params.operand1Value, 16, 2)}`;
                    } else if (params.operand1Type === OperandType.REGISTER_8BITS ||
                        params.operand1Type === OperandType.REGISTER_16BITS) {
                        ret += ` (0x${Utils.pad(params.operand1Value, 16, 2)}: ${CPURegisterIndex[params.operand1Value]}`;
                    } else {
                        ret += ` (0x${Utils.pad(params.operand1Value, 16, 4)}`;
                    }

                } else {
                    break;
                }

                if (params.operand2Type !== undefined) {

                    if (params.operand2Type === OperandType.BYTE) {
                        ret += `, 0x${Utils.pad(params.operand2Value, 16, 2)})`;
                    } else if (params.operand2Type === OperandType.REGISTER_8BITS ||
                        params.operand2Type === OperandType.REGISTER_16BITS) {
                        ret += `, 0x${Utils.pad(params.operand2Value, 16, 2)}: ${CPURegisterIndex[params.operand2Value]})`;
                    } else {
                        ret += `, 0x${Utils.pad(params.operand2Value, 16, 4)})`;
                    }

                } else {
                    ret += `)`;
                }
                break;
            case ControlUnitOperationType.HALTED:
                ret = `CU: CPU in halt mode`;
                break;
            case ControlUnitOperationType.WAKE_UP:
                ret = `CU: CPU leaving halt mode`;
                break;
            case ControlUnitOperationType.CPU_FAULT:
                ret = `CU: CPU in fault mode`;
                break;
            case ControlUnitOperationType.IRQ_RAISE_LEVEL:
                ret = `CU: Risen CPU interrupt level signal`;
                break;
            case ControlUnitOperationType.IRQ_LOWER_LEVEL:
                ret = `CU: Lowered CPU interrupt level signal`;
                break;
            default:
                break;
        }

        return ret;

    }

}


@Injectable()
export class CPUService {

    protected registersBank: Map<CPURegisterIndex, CPURegister> = new Map<CPURegisterIndex, CPURegister>();

    protected cpuRegisterOperationSource = new Subject<CPURegisterOperation>();
    public cpuRegisterOperation$: Observable<CPURegisterOperation>;
    private cpuRegisterOperationSubscription: Subscription;

    protected aluOperationSource = new Subject<ALUOperation>();
    public aluOperation$: Observable<ALUOperation>;

    protected controlUnitOperationSource = new Subject<ControlUnitOperation>();
    public controlUnitOperation$: Observable<ControlUnitOperation>;

    protected nextIP = 0;

    protected userSP: CPURegister;
    protected supervisorSP: CPURegister;

    protected alu: ArithmeticLogicUnit;

    private interruptInput = 0;

    private isHalted = false;
    private isFault = false;

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
                byte = 'high';
                break;
            case CPURegisterIndex.AL:
            case CPURegisterIndex.BL:
            case CPURegisterIndex.CL:
            case CPURegisterIndex.DL:
                byte = 'low';
                break;
        }
        return byte;

    }

    constructor(private memoryService: MemoryService,
                private clockService: ClockService,
                private ioRegMapService: IORegMapService,
                private eventsLogService: EventsLogService) {

        const registerA = new CPUGeneralPurposeRegister('A', CPURegisterIndex.A,
            CPURegisterIndex.AH, CPURegisterIndex.AL, 0,
            (op) => this.publishRegisterOperation(op), 'General Purpose Register A');
        this.registersBank.set(CPURegisterIndex.A, registerA);
        this.registersBank.set(CPURegisterIndex.AH, registerA);
        this.registersBank.set(CPURegisterIndex.AL, registerA);

        const registerB = new CPUGeneralPurposeRegister('B', CPURegisterIndex.B,
            CPURegisterIndex.BH, CPURegisterIndex.BL, 0,
            (op) => this.publishRegisterOperation(op), 'General Purpose Register B');
        this.registersBank.set(CPURegisterIndex.B, registerB);
        this.registersBank.set(CPURegisterIndex.BH, registerB);
        this.registersBank.set(CPURegisterIndex.BL, registerB);

        const registerC = new CPUGeneralPurposeRegister('C', CPURegisterIndex.C,
            CPURegisterIndex.CH, CPURegisterIndex.CL, 0,
            (op) => this.publishRegisterOperation(op), 'General Purpose Register C');
        this.registersBank.set(CPURegisterIndex.C, registerC);
        this.registersBank.set(CPURegisterIndex.CH, registerC);
        this.registersBank.set(CPURegisterIndex.CL, registerC);

        const registerD = new CPUGeneralPurposeRegister('D', CPURegisterIndex.D,
            CPURegisterIndex.DH, CPURegisterIndex.DL, 0,
            (op) => this.publishRegisterOperation(op), 'General Purpose Register D');
        this.registersBank.set(CPURegisterIndex.D, registerD);
        this.registersBank.set(CPURegisterIndex.DH, registerD);
        this.registersBank.set(CPURegisterIndex.DL, registerD);

        this.userSP = new CPURegister('USP', CPURegisterIndex.USP, 0,
            (op) => this.publishRegisterOperation(op), 'User Stack Pointer Register');
        this.supervisorSP = new CPURegister('SSP', CPURegisterIndex.SSP, 0,
            (op) => this.publishRegisterOperation(op), 'Supervisor Stack Pointer Register');

        this.registersBank.set(CPURegisterIndex.SP, this.supervisorSP);
        this.registersBank.set(CPURegisterIndex.USP, this.userSP);
        this.registersBank.set(CPURegisterIndex.SSP, this.supervisorSP);

        this.registersBank.set(CPURegisterIndex.IP,
            new CPURegister('IP', CPURegisterIndex.IP, 0,
                (op) => this.publishRegisterOperation(op), 'Instruction Pointer Register'));

        const statusRegister = new CPUStatusRegister('SR', CPURegisterIndex.SR, 0x8000,
            (op) => this.publishRegisterOperation(op), 'Status Register');
        this.registersBank.set(CPURegisterIndex.SR, statusRegister);

        this.cpuRegisterOperation$ = this.cpuRegisterOperationSource.asObservable();

        this.cpuRegisterOperationSubscription = this.cpuRegisterOperation$.subscribe(
            (cpuRegisterOperation) => this.processCPURegisterOperation(cpuRegisterOperation)
        );

        this.aluOperation$ = this.aluOperationSource.asObservable();
        this.controlUnitOperation$ = this.controlUnitOperationSource.asObservable();

        this.alu = new ArithmeticLogicUnit(statusRegister, (op) => this.publishALUOperation(op));

    }

    protected publishRegisterOperation(operation: CPURegisterOperation) {

        this.eventsLogService.log(operation);
        this.cpuRegisterOperationSource.next(operation);

    }

    protected publishALUOperation(operation: ALUOperation) {

        this.eventsLogService.log(operation);
        this.aluOperationSource.next(operation);

    }

    protected publishControlUnitOperation(operation: ControlUnitOperation, flushGroups: boolean = false) {

        this.eventsLogService.log(operation, flushGroups);
        this.controlUnitOperationSource.next(operation);

    }

    protected publishControlUnitOperationStart(operation: ControlUnitOperation) {

        operation.state = ControlUnitOperationState.IN_PROGRESS;
        this.eventsLogService.startEventGroup(operation);
        this.controlUnitOperationSource.next(operation);

    }

    protected publishControlUnitOperationEnd(operation: ControlUnitOperation) {

        operation.state = ControlUnitOperationState.FINISHED;
        this.eventsLogService.endEventGroup(operation);
        this.controlUnitOperationSource.next(operation);

    }

    private operationWriteRegister(index: CPURegisterIndex, value: number) {

        if (index === CPURegisterIndex.SR) {
            if ((value & (1 << SRBit.HALT)) !== 0 && this.isHalted === false) {
                // The system was halted from within the CU by executing HLT
                this.isHalted = true;
                this.publishControlUnitOperation(new ControlUnitOperation(ControlUnitOperationType.HALTED), true);
            }
        }

    }

    private operationWriteBit(index: number, bitNumber: number, value: number) {

        if (index === CPURegisterIndex.SR) {

            if (bitNumber === SRBit.HALT && value === 1 && this.isHalted === false) {
                this.isHalted = true;
                this.publishControlUnitOperation(new ControlUnitOperation(ControlUnitOperationType.HALTED), true);
            }

        }

    }

    private processCPURegisterOperation(cpuRegisterOperation: CPURegisterOperation) {

        switch (cpuRegisterOperation.operationType) {

            case CPURegisterOperationType.WRITE:
                this.operationWriteRegister(
                    (<CPURegisterRegularOpParams>cpuRegisterOperation.data).index,
                    (<CPURegisterRegularOpParams>cpuRegisterOperation.data).value);
                break;
            case CPURegisterOperationType.WRITE_BIT:
                this.operationWriteBit(
                    (<CPURegisterBitOpParams>cpuRegisterOperation.data).index,
                    (<CPURegisterBitOpParams>cpuRegisterOperation.data).bitNumber,
                    (<CPURegisterBitOpParams>cpuRegisterOperation.data).value);
                break;
        }
    }

    public getRegistersBank(): Map<CPURegisterIndex, CPURegister> {

        return this.registersBank;

    }

    public get SP(): CPURegister {
        return <CPURegister>this.registersBank.get(CPURegisterIndex.SP);
    }

    public get IP(): CPURegister {
        return this.registersBank.get(CPURegisterIndex.IP);
    }

    public get SR(): CPUStatusRegister {
        return <CPUStatusRegister>this.registersBank.get(CPURegisterIndex.SR);
    }

    protected pushByte(value: number) {

        const currentSP = this.SP.value;
        this.memoryService.storeByte(currentSP, value,
            (this.SR.supervisor === 1 ? MemoryAccessActor.CPU_SUPERVISOR : MemoryAccessActor.CPU_USER));
        this.SP.value = currentSP - 1;

    }

    protected pushWord(value: number) {

        const currentSP = this.SP.value;
        this.memoryService.storeWord(currentSP - 1, value,
            (this.SR.supervisor === 1 ? MemoryAccessActor.CPU_SUPERVISOR : MemoryAccessActor.CPU_USER));
        this.SP.value = currentSP - 2;

    }

    protected popByte(): number {

        const currentSP = this.SP.value;
        const value = this.memoryService.loadByte(currentSP + 1);
        this.SP.value = currentSP + 1;

        return value;

    }

    protected popWord(): number {

        const currentSP = this.SP.value;
        const value = this.memoryService.loadWord(currentSP + 1);
        this.SP.value = currentSP + 2;

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

        try {
            this.pushWord(currentSR);
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value);
        }
        try {
            this.pushWord(currentSP);
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value);
        }
        try {
            this.pushWord(currentIP);
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value);
        }

        this.IP.value = IRQ_VECTOR_ADDRESS;

        this.SR.irqMask = 0;

    }

    public raiseInterrupt() {

        if (this.isFault === true) {

            throw Error('CPU in FAULT mode: reset required');

        }

        let operation;

        this.interruptInput = 1;

        operation = new ControlUnitOperation(ControlUnitOperationType.IRQ_RAISE_LEVEL);

        this.publishControlUnitOperation(operation);

        if (this.SR.irqMask === 1) {

            operation = new ControlUnitOperation(ControlUnitOperationType.WAKE_UP);

            this.publishControlUnitOperationStart(operation);

            this.isHalted = false;

            this.SR.halt = 0;

            this.publishControlUnitOperationEnd(operation);

            try {

                this.toInterruptHandler();

            } catch (e) {
                this.SR.fault = 1;
                this.isFault = true;
                this.publishControlUnitOperation(new ControlUnitOperation(ControlUnitOperationType.CPU_FAULT));
            }


        }

    }

    public lowerInterrupt(): void {

        this.interruptInput = 0;

        this.publishControlUnitOperation(new ControlUnitOperation(ControlUnitOperationType.IRQ_LOWER_LEVEL));

    }

    public reset(): void {

        const operation = new ControlUnitOperation(ControlUnitOperationType.RESET);

        this.publishControlUnitOperationStart(operation);

        this.registersBank.get(CPURegisterIndex.A).value = this.registersBank.get(CPURegisterIndex.A).resetValue;
        this.registersBank.get(CPURegisterIndex.B).value = this.registersBank.get(CPURegisterIndex.B).resetValue;
        this.registersBank.get(CPURegisterIndex.C).value = this.registersBank.get(CPURegisterIndex.C).resetValue;
        this.registersBank.get(CPURegisterIndex.D).value = this.registersBank.get(CPURegisterIndex.D).resetValue;
        this.registersBank.get(CPURegisterIndex.IP).value = this.registersBank.get(CPURegisterIndex.IP).resetValue;

        this.isHalted = false;
        this.isFault = false;

        this.registersBank.get(CPURegisterIndex.SR).value = this.registersBank.get(CPURegisterIndex.SR).resetValue;

        this.userSP.value = this.userSP.resetValue;
        this.supervisorSP.value = this.supervisorSP.resetValue;
        this.registersBank.set(CPURegisterIndex.SP, this.supervisorSP);

        this.interruptInput = 0;

        this.publishControlUnitOperationEnd(operation);

    }

    private fetchAndDecode(args: Array<number>): InstructionSpec {

        let opcode, parameters, operation;

        parameters = <CUOperationParamsFetchOpCode> {
            address: this.nextIP
        };

        operation = new ControlUnitOperation(ControlUnitOperationType.FETCH_OPCODE, parameters);

        this.publishControlUnitOperationStart(operation);

        try {
            opcode = this.memoryService.loadByte(this.nextIP);
        } catch (e) {
            throw new Exception(ExceptionType.INSTRUCTION_FETCH_ERROR,
                `Error when fetching instruction at ${this.nextIP}`, this.IP.value, this.SP.value, this.SR.value);
        }

        this.publishControlUnitOperationEnd(operation);

        this.nextIP += 1;

        parameters = <CUOperationParamsDecode> {
            opcode: opcode
        };

        this.publishControlUnitOperation(new ControlUnitOperation(ControlUnitOperationType.DECODE, parameters));

        const instruction = instructionSet.getInstructionFromOpCode(opcode);

        if (instruction === undefined) {
            throw new Exception(ExceptionType.UNKNOWN_OPCODE,
                `Invalid opcode: ${opcode}`, this.IP.value, this.SP.value, this.SR.value);
        }

        parameters = <CUOperationParamsFetchOperands> {
            opcode: instruction.opcode,
            address: this.nextIP,
            operand1Type: instruction.operand1,
            operand2Type: instruction.operand2
        };

        operation = new ControlUnitOperation(ControlUnitOperationType.FETCH_OPERANDS, parameters);

        this.publishControlUnitOperationStart(operation);

        let byte, word, register, regaddress, offset, address;

        switch (instruction.operand1) {

            case OperandType.BYTE:
                try {
                    byte = this.memoryService.loadByte(this.nextIP);
                } catch (e) {
                    throw new Exception(ExceptionType.INSTRUCTION_FETCH_ERROR,
                        `Error when fetching instruction at ${this.nextIP}`, this.IP.value, this.SP.value, this.SR.value);
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
                        `Error when fetching instruction at ${this.nextIP}`, this.IP.value, this.SP.value, this.SR.value);
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
                        `Error when fetching instruction at ${this.nextIP}`, this.IP.value, this.SP.value, this.SR.value);
                }
                args.push(word);
                this.nextIP += 2;
                break;
            case OperandType.REGADDRESS:
                try {
                    regaddress = this.memoryService.loadWord(this.nextIP);
                } catch (e) {
                    throw new Exception(ExceptionType.INSTRUCTION_FETCH_ERROR,
                        `Error when fetching instruction at ${this.nextIP}`, this.IP.value, this.SP.value, this.SR.value);
                }

                offset = (regaddress & 0xFF00) >>> 8;
                register = (regaddress & 0x00FF);
                if (offset > 127) {
                    offset = offset - 256;
                }

                parameters = <CUOperationParamsResolveRegAddress> {
                    register: register,
                    offset: offset
                };

                this.publishControlUnitOperation(new ControlUnitOperation(ControlUnitOperationType.RESOLVE_REGADDRESS, parameters));

                if (CPUService.is16bitsGPRorSP(register) === false) {
                    throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                        `Invalid first operand: register index ${register} out of bounds`,
                        this.IP.value, this.SP.value, this.SR.value);
                }
                address = this.registersBank.get(register).value + offset;
                args.push(address);

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
                        `Error when fetching instruction at ${this.nextIP}`, this.IP.value, this.SP.value, this.SR.value);
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
                        `Error when fetching instruction at ${this.nextIP}`, this.IP.value, this.SP.value, this.SR.value);
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
                        `Error when fetching instruction at ${this.nextIP}`, this.IP.value, this.SP.value, this.SR.value);
                }
                args.push(word);
                this.nextIP += 2;
                break;
            case OperandType.REGADDRESS:
                try {
                    regaddress = this.memoryService.loadWord(this.nextIP);
                } catch (e) {
                    throw new Exception(ExceptionType.INSTRUCTION_FETCH_ERROR,
                        `Error when fetching instruction at ${this.nextIP}`, this.IP.value, this.SP.value, this.SR.value);
                }

                offset = (regaddress & 0xFF00) >>> 8;
                register = (regaddress & 0x00FF);
                if (offset > 127) {
                    offset = offset - 256;
                }

                parameters = <CUOperationParamsResolveRegAddress> {
                    register: register,
                    offset: offset
                };

                this.publishControlUnitOperation(new ControlUnitOperation(ControlUnitOperationType.RESOLVE_REGADDRESS, parameters));

                if (CPUService.is16bitsGPRorSP(register) === false) {
                    throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                        `Invalid first operand: register index ${register} out of bounds`,
                        this.IP.value, this.SP.value, this.SR.value);
                }
                address = this.registersBank.get(register).value + offset;
                args.push(address);

                this.nextIP += 2;
                break;
        }

        this.publishControlUnitOperationEnd(operation);

        return instruction;

    }

    public step(): void {

        if (this.isFault === true) {

            throw Error('CPU in FAULT mode: reset required');

        } else if (this.isHalted === true) {

            this.clockService.consumeTicks(1);

            return;

        }

        this.nextIP = this.IP.value;

        let operation;

        try {

            const args: Array<number> = [];
            const instruction = this.fetchAndDecode(args);

            const parameters: CUOperationParamsExecute = {
                opcode: instruction.opcode,
                operand1Type: instruction.operand1,
                operand1Value: args[0],
                operand2Type: instruction.operand2,
                operand2Value: args[1]
            };

            operation = new ControlUnitOperation(ControlUnitOperationType.EXECUTE, parameters);

            this.publishControlUnitOperationStart(operation);

            if (this[instruction.methodName].apply(this, args) === true) {
                this.publishControlUnitOperationEnd(operation);

                this.IP.value = this.nextIP;
            } else {
                this.publishControlUnitOperationEnd(operation);
            }

            this.clockService.consumeTicks(1);

        } catch (e) {

            if (e instanceof Exception && this.SR.supervisor === 0) {

                if (operation) {
                    this.publishControlUnitOperationEnd(operation);
                }

                this.SR.supervisor = 1;

                this.registersBank.set(CPURegisterIndex.SP, this.supervisorSP);

                try {

                    this.pushWord(e.SR);
                    this.pushWord(e.SP);
                    this.pushWord(e.IP);

                    if (e.type === ExceptionType.MEMORY_ACCESS_ERROR) {
                        this.pushWord(e.memoryAddress);
                    }

                    this.pushWord(e.type);

                } catch (e) {
                    this.SR.fault = 1;
                    this.isFault = true;
                    this.publishControlUnitOperation(new ControlUnitOperation(ControlUnitOperationType.CPU_FAULT));
                    throw Error(`Exception occurred while creating the exception frame: ${e.message}`);
                }

                this.IP.value = EXCEPTION_VECTOR_ADDRESS;

            } else if (e instanceof Exception) {
                this.SR.fault = 1;
                this.isFault = true;
                this.publishControlUnitOperation(new ControlUnitOperation(ControlUnitOperationType.CPU_FAULT));
                throw Error(`Exception occurred while in supervisor mode: ${e.message}`);
            } else {
                this.SR.fault = 1;
                this.isFault = true;
                this.publishControlUnitOperation(new ControlUnitOperation(ControlUnitOperationType.CPU_FAULT));
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
                this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        this.registersBank.get(toRegister).value = this.registersBank.get(fromRegister).value;

        return true;

    }

    @Instruction(OpCode.MOV_ADDRESS_TO_REG16, 'MOV', OperandType.REGISTER_16BITS, OperandType.ADDRESS)
    private instrMOV_ADDRESS_TO_REG16(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        let word;

        try {
            word = this.memoryService.loadWord(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.registersBank.get(toRegister).value = word;

        return true;

    }

    @Instruction(OpCode.MOV_REGADDRESS_TO_REG16, 'MOV', OperandType.REGISTER_16BITS, OperandType.REGADDRESS)
    private instrMOV_REGADDRESS_TO_REG16(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        this.registersBank.get(toRegister).value = this.memoryService.loadWord(fromAddress);

        return true;

    }

    @Instruction(OpCode.MOV_REG16_TO_ADDRESS, 'MOV', OperandType.ADDRESS, OperandType.REGISTER_16BITS)
    private instrMOV_REG16_TO_ADDRESS(toAddress: number, fromRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        try {
            this.memoryService.storeWord(toAddress, this.registersBank.get(fromRegister).value,
                (this.SR.supervisor === 1 ? MemoryAccessActor.CPU_SUPERVISOR : MemoryAccessActor.CPU_USER));
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }

        return true;

    }

    @Instruction(OpCode.MOV_REG16_TO_REGADDRESS, 'MOV', OperandType.REGADDRESS, OperandType.REGISTER_16BITS)
    private instrMOV_REG16_TO_REGADDRESS(toAddress: number, fromRegister: number): boolean {


        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        try {
            this.memoryService.storeWord(toAddress, this.registersBank.get(fromRegister).value,
                (this.SR.supervisor === 1 ? MemoryAccessActor.CPU_SUPERVISOR : MemoryAccessActor.CPU_USER));
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }

        return true;

    }

    @Instruction(OpCode.MOV_WORD_TO_REG16, 'MOV', OperandType.REGISTER_16BITS, OperandType.WORD)
    private instrMOV_WORD_TO_REG16(toRegister: number, word: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        this.registersBank.get(toRegister).value = word;

        return true;
    }

    @Instruction(OpCode.MOV_WORD_TO_ADDRESS, 'MOV', OperandType.ADDRESS, OperandType.WORD)
    private instrMOV_WORD_TO_ADDRESS(toAddress: number, word: number): boolean {

        try {
            this.memoryService.storeWord(toAddress, word,
                (this.SR.supervisor === 1 ? MemoryAccessActor.CPU_SUPERVISOR : MemoryAccessActor.CPU_USER));
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }

        return true;

    }

    @Instruction(OpCode.MOV_WORD_TO_REGADDRESS, 'MOV', OperandType.REGADDRESS, OperandType.WORD)
    private instrMOV_WORD_TO_REGADDRESS(toAddress: number, word: number): boolean {

        try {
            this.memoryService.storeWord(toAddress, word,
                (this.SR.supervisor === 1 ? MemoryAccessActor.CPU_SUPERVISOR : MemoryAccessActor.CPU_USER));
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }

        return true;

    }

    @Instruction(OpCode.MOVB_REG8_TO_REG8, 'MOVB', OperandType.REGISTER_8BITS, OperandType.REGISTER_8BITS)
    private instrMOVB_REG8_TO_REG8(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService.is8bitsGPR(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
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
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.registersBank.get(toRegister)[byteToRegister] = byte;

        return true;

    }

    @Instruction(OpCode.MOVB_REGADDRESS_TO_REG8, 'MOVB', OperandType.REGISTER_8BITS, OperandType.REGADDRESS)
    private instrMOVB_REGADDRESS_TO_REG8(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.registersBank.get(toRegister)[byteToRegister] = byte;

        return true;

    }

    @Instruction(OpCode.MOVB_REG8_TO_ADDRESS, 'MOVB', OperandType.ADDRESS, OperandType.REGISTER_8BITS)
    private instrMOVB_REG8_TO_ADDRESS(toAddress: number, fromRegister: number): boolean {

        if (CPUService.is8bitsGPR(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteFromRegister = CPUService.getByteFrom8bitsGPR(fromRegister);

        try {
            this.memoryService.storeByte(toAddress, this.registersBank.get(fromRegister)[byteFromRegister],
                (this.SR.supervisor === 1 ? MemoryAccessActor.CPU_SUPERVISOR : MemoryAccessActor.CPU_USER));
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }

        return true;


    }

    @Instruction(OpCode.MOVB_REG8_TO_REGADDRESS, 'MOVB', OperandType.REGADDRESS, OperandType.REGISTER_8BITS)
    private instrMOVB_REG8_TO_REGADDRESS(toAddress: number, fromRegister: number): boolean {

        if (CPUService.is8bitsGPR(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteFromRegister = CPUService.getByteFrom8bitsGPR(fromRegister);

        try {
            this.memoryService.storeByte(toAddress, this.registersBank.get(fromRegister)[byteFromRegister],
                (this.SR.supervisor === 1 ? MemoryAccessActor.CPU_SUPERVISOR : MemoryAccessActor.CPU_USER));
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }

        return true;

    }

    @Instruction(OpCode.MOVB_BYTE_TO_REG8, 'MOVB', OperandType.REGISTER_8BITS, OperandType.BYTE)
    private instrMOVB_BYTE_TO_REG8(toRegister: number, byte: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        this.registersBank.get(toRegister)[byteToRegister] = byte;

        return true;

    }

    @Instruction(OpCode.MOVB_BYTE_TO_ADDRESS, 'MOVB', OperandType.ADDRESS, OperandType.BYTE)
    private instrMOVB_BYTE_TO_ADDRESS(toAddress: number, byte: number): boolean {

        try {
            this.memoryService.storeByte(toAddress, byte,
                (this.SR.supervisor === 1 ? MemoryAccessActor.CPU_SUPERVISOR : MemoryAccessActor.CPU_USER));
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }

        return true;

    }

    @Instruction(OpCode.MOVB_BYTE_TO_REGADDRESS, 'MOVB', OperandType.REGADDRESS, OperandType.BYTE)
    private instrMOVB_BYTE_TO_REGADDRESS(toAddress: number, byte: number): boolean {

        try {
            this.memoryService.storeByte(toAddress, byte,
                (this.SR.supervisor === 1 ? MemoryAccessActor.CPU_SUPERVISOR : MemoryAccessActor.CPU_USER));
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }

        return true;

    }

    @Instruction(OpCode.ADD_REG16_TO_REG16, 'ADD', OperandType.REGISTER_16BITS, OperandType.REGISTER_16BITS)
    private instrADD_REG16_TO_REG16(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        this.registersBank.get(toRegister).value =
            this.alu.performAddition16Bits(this.registersBank.get(toRegister).value,
                                           this.registersBank.get(fromRegister).value);

        return true;

    }

    @Instruction(OpCode.ADD_REGADDRESS_TO_REG16, 'ADD', OperandType.REGISTER_16BITS, OperandType.REGADDRESS)
    private instrADD_REGADDRESS_TO_REG16(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        let word;

        try {
            word = this.memoryService.loadWord(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.registersBank.get(toRegister).value =
            this.alu.performAddition16Bits(this.registersBank.get(toRegister).value, word);

        return true;

    }

    @Instruction(OpCode.ADD_ADDRESS_TO_REG16, 'ADD', OperandType.REGISTER_16BITS, OperandType.ADDRESS)
    private instrADD_ADDRESS_TO_REG16(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        let word;

        try {
            word = this.memoryService.loadWord(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.registersBank.get(toRegister).value =
            this.alu.performAddition16Bits(this.registersBank.get(toRegister).value, word);

        return true;

    }

    @Instruction(OpCode.ADD_WORD_TO_REG16, 'ADD', OperandType.REGISTER_16BITS, OperandType.WORD)
    private instrADD_WORD_TO_REG16(toRegister: number, word: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        this.registersBank.get(toRegister).value =
            this.alu.performAddition16Bits(this.registersBank.get(toRegister).value, word);

        return true;

    }

    @Instruction(OpCode.ADDB_REG8_TO_REG8, 'ADDB', OperandType.REGISTER_8BITS, OperandType.REGISTER_8BITS)
    private instrADDB_REG8_TO_REG8(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService.is8bitsGPR(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);
        const byteFromRegister = CPUService.getByteFrom8bitsGPR(fromRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performAddition8Bits(this.registersBank.get(toRegister)[byteToRegister],
                this.registersBank.get(fromRegister)[byteFromRegister]);

        return true;

    }

    @Instruction(OpCode.ADDB_REGADDRESS_TO_REG8, 'ADDB', OperandType.REGISTER_8BITS, OperandType.REGADDRESS)
    private instrADDB_REGADDRESS_TO_REG8(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performAddition8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);

        return true;

    }

    @Instruction(OpCode.ADDB_ADDRESS_TO_REG8, 'ADDB', OperandType.REGISTER_8BITS, OperandType.ADDRESS)
    private instrADDB_ADDRESS_TO_REG8(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(fromAddress) ;
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performAddition8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);

        return true;

    }

    @Instruction(OpCode.ADDB_BYTE_TO_REG8, 'ADDB', OperandType.REGISTER_8BITS, OperandType.BYTE)
    private instrADDB_BYTE_TO_REG(toRegister: number, byte: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performAddition8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);

        return true;

    }

    @Instruction(OpCode.SUB_REG16_FROM_REG16, 'SUB', OperandType.REGISTER_16BITS, OperandType.REGISTER_16BITS)
    private instrSUB_REG16_FROM_REG16(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        this.registersBank.get(toRegister).value =
            this.alu.performSubstraction16Bits(this.registersBank.get(toRegister).value,
                                     this.registersBank.get(fromRegister).value);

        return true;

    }

    @Instruction(OpCode.SUB_REGADDRESS_FROM_REG16, 'SUB', OperandType.REGISTER_16BITS, OperandType.REGADDRESS)
    private instrSUB_REGADDRESS_FROM_REG16(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        let word;

        try {
            word = this.memoryService.loadWord(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.registersBank.get(toRegister).value =
            this.alu.performSubstraction16Bits(this.registersBank.get(toRegister).value, word);

        return true;

    }

    @Instruction(OpCode.SUB_ADDRESS_FROM_REG16, 'SUB', OperandType.REGISTER_16BITS, OperandType.ADDRESS)
    private instrSUB_ADDRESS_FROM_REG16(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        let word;

        try {
            word = this.memoryService.loadWord(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.registersBank.get(toRegister).value =
            this.alu.performSubstraction16Bits(this.registersBank.get(toRegister).value, word);

        return true;

    }

    @Instruction(OpCode.SUB_WORD_FROM_REG16, 'SUB', OperandType.REGISTER_16BITS, OperandType.WORD)
    private instrSUB_WORD_FROM_REG16(toRegister: number, word: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        this.registersBank.get(toRegister).value =
            this.alu.performSubstraction16Bits(this.registersBank.get(toRegister).value, word);

        return true;

    }

    @Instruction(OpCode.SUBB_REG8_FROM_REG8, 'SUBB', OperandType.REGISTER_8BITS, OperandType.REGISTER_8BITS)
    private instrSUBB_REG8_FROM_REG8(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService.is8bitsGPR(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);
        const byteFromRegister = CPUService.getByteFrom8bitsGPR(fromRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performSubstraction8Bits(this.registersBank.get(toRegister)[byteToRegister],
                this.registersBank.get(fromRegister)[byteFromRegister]);

        return true;

    }

    @Instruction(OpCode.SUBB_REGADDRESS_FROM_REG8, 'SUBB', OperandType.REGISTER_8BITS, OperandType.REGADDRESS)
    private instrSUBB_REGADDRESS_FROM_REG8(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performSubstraction8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);

        return true;

    }

    @Instruction(OpCode.SUBB_ADDRESS_FROM_REG8, 'SUBB', OperandType.REGISTER_8BITS, OperandType.ADDRESS)
    private instrSUBB_ADDRESS_FROM_REG8(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performSubstraction8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);

        return true;

    }

    @Instruction(OpCode.SUBB_BYTE_FROM_REG8, 'SUBB', OperandType.REGISTER_8BITS, OperandType.BYTE)
    private instrSUBB_BYTE_FROM_REG8(toRegister: number, byte: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performSubstraction8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);

        return true;

    }

    @Instruction(OpCode.INC_REG16, 'INC', OperandType.REGISTER_16BITS)
    private instrINC_REG16(toRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        this.registersBank.get(toRegister).value =
            this.alu.performAddition16Bits(this.registersBank.get(toRegister).value, 1);

        return true;

    }

    @Instruction(OpCode.INCB_REG8, 'INCB', OperandType.REGISTER_8BITS)
    private instrINCB_REG8(toRegister: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performAddition8Bits(this.registersBank.get(toRegister)[byteToRegister], 1);

        return true;

    }

    @Instruction(OpCode.DEC_REG16, 'DEC', OperandType.REGISTER_16BITS)
    private instrDEC_REG16(toRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        this.registersBank.get(toRegister).value =
            this.alu.performSubstraction16Bits(this.registersBank.get(toRegister).value, 1);

        return true;

    }

    @Instruction(OpCode.DECB_REG8, 'DECB', OperandType.REGISTER_8BITS)
    private instrDECB_REG8(toRegister: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performSubstraction8Bits(this.registersBank.get(toRegister)[byteToRegister], 1);

        return true;

    }

    @Instruction(OpCode.CMP_REG16_WITH_REG16, 'CMP', OperandType.REGISTER_16BITS, OperandType.REGISTER_16BITS)
    private instrCMP_REG16_WITH_REG16(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        this.alu.performSubstraction16Bits(this.registersBank.get(toRegister).value,
            this.registersBank.get(fromRegister).value);

        return true;

    }

    @Instruction(OpCode.CMP_REGADDRESS_WITH_REG16, 'CMP', OperandType.REGISTER_16BITS, OperandType.REGADDRESS)
    private instrCMP_REGADDRESS_WITH_REG16(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        let word;

        try {
            word = this.memoryService.loadWord(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.alu.performSubstraction16Bits(this.registersBank.get(toRegister).value, word);

        return true;

    }

    @Instruction(OpCode.CMP_ADDRESS_WITH_REG16, 'CMP', OperandType.REGISTER_16BITS, OperandType.ADDRESS)
    private instrCMP_ADDRESS_WITH_REG16(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        let word;

        try {
            word = this.memoryService.loadWord(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.alu.performSubstraction16Bits(this.registersBank.get(toRegister).value, word);

        return true;

    }

    @Instruction(OpCode.CMP_WORD_WITH_REG16, 'CMP', OperandType.REGISTER_16BITS, OperandType.WORD)
    private instrCMP_WORD_WITH_REG16(toRegister: number, word: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        this.alu.performSubstraction16Bits(this.registersBank.get(toRegister).value, word);

        return true;

    }

    @Instruction(OpCode.CMPB_REG8_WITH_REG8, 'CMPB', OperandType.REGISTER_8BITS, OperandType.REGISTER_8BITS)
    private instrCMPB_REG8_WITH_REG8(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService.is8bitsGPR(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);
        const byteFromRegister = CPUService.getByteFrom8bitsGPR(fromRegister);

        this.alu.performSubstraction8Bits(this.registersBank.get(toRegister)[byteToRegister],
            this.registersBank.get(fromRegister)[byteFromRegister]);

        return true;

    }

    @Instruction(OpCode.CMPB_REGADDRESS_WITH_REG8, 'CMPB', OperandType.REGISTER_8BITS, OperandType.REGADDRESS)
    private instrCMPB_REGADDRESS_WITH_REG8(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.alu.performSubstraction8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);

        return true;

    }

    @Instruction(OpCode.CMPB_ADDRESS_WITH_REG8, 'CMPB', OperandType.REGISTER_8BITS, OperandType.ADDRESS)
    private instrCMPB_ADDRESS_WITH_REG8(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.alu.performSubstraction8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);

        return true;

    }

    @Instruction(OpCode.CMPB_BYTE_WITH_REG8, 'CMPB', OperandType.REGISTER_8BITS, OperandType.BYTE)
    private instrCMPB_BYTE_WITH_REG8(toRegister: number, byte: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        this.alu.performSubstraction8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);

        return true;

    }

    @Instruction(OpCode.JMP_REGADDRESS, 'JMP', OperandType.REGADDRESS)
    private instrJMP_REGADDRESS(toAddress: number): boolean {

        this.IP.value = toAddress;

        return false;

    }

    @Instruction(OpCode.JMP_ADDRESS, 'JMP', OperandType.WORD)
    private instrJMP_ADDRESS(toAddress: number): boolean {

        this.IP.value = toAddress;

        return false;

    }

    @Instruction(OpCode.JC_REGADDRESS, 'JC', OperandType.REGADDRESS, undefined, ['JB', 'JNAE'])
    private instrJC_REGADDRESS(toAddress: number): boolean {

        if (this.SR.carry === 1) {
            this.IP.value = toAddress;
            return false;
        } else {
            return true;
        }

    }

    @Instruction(OpCode.JC_ADDRESS, 'JC', OperandType.WORD, undefined, ['JB', 'JNAE'])
    private instrJC_ADDRESS(toAddress: number): boolean {

        if (this.SR.carry === 1) {
            this.IP.value = toAddress;
            return false;
        } else {
            return true;
        }

    }

    @Instruction(OpCode.JNC_REGADDRESS, 'JNC', OperandType.REGADDRESS, undefined, ['JNB', 'JAE'])
    private instrJNC_REGADDRESS(toAddress: number): boolean {

        if (this.SR.carry === 0) {
            this.IP.value = toAddress;
            return false;
        } else {
            return true;
        }

    }

    @Instruction(OpCode.JNC_ADDRESS, 'JNC', OperandType.WORD, undefined, ['JNB', 'JAE'])
    private instrJNC_ADDRESS(toAddress: number): boolean {

        if (this.SR.carry === 0) {
            this.IP.value = toAddress;
            return false;
        } else {
            return true;
        }

    }

    @Instruction(OpCode.JZ_REGADDRESS, 'JZ', OperandType.REGADDRESS, undefined, ['JE'])
    private instrJZ_REGADDRESS(toAddress: number): boolean {

        if (this.SR.zero === 1) {
            this.IP.value = toAddress;
            return false;
        } else {
            return true;
        }

    }

    @Instruction(OpCode.JZ_ADDRESS, 'JZ', OperandType.WORD, undefined, ['JE'])
    private instrJZ_ADDRESS(toAddress: number): boolean {

        if (this.SR.zero === 1) {
            this.IP.value = toAddress;
            return false;
        } else {
            return true;
        }

    }

    @Instruction(OpCode.JNZ_REGADDRESS, 'JNZ', OperandType.REGADDRESS, undefined, ['JNE'])
    private instrJNZ_REGADDRESS(toAddress: number): boolean {

        if (this.SR.zero === 0) {
            this.IP.value = toAddress;
            return false;
        } else {
            return true;
        }

    }

    @Instruction(OpCode.JNZ_ADDRESS, 'JNZ', OperandType.WORD, undefined, ['JNE'])
    private instrJNZ_ADDRESS(toAddress: number): boolean {

        if (this.SR.zero === 0) {
            this.IP.value = toAddress;
            return false;
        } else {
            return true;
        }

    }

    @Instruction(OpCode.JA_REGADDRESS, 'JA', OperandType.REGADDRESS, undefined, ['JNBE'])
    private instrJA_REGADDRESS(toAddress: number): boolean {

        if ((this.SR.carry === 0) && (this.SR.zero === 0)) {
            this.IP.value = toAddress;
            return false;
        } else {
            return true;
        }

    }

    @Instruction(OpCode.JA_ADDRESS, 'JA', OperandType.WORD, undefined, ['JNBE'])
    private instrJA_ADDRESS(toAddress: number): boolean {

        if ((this.SR.carry === 0) && (this.SR.zero === 0)) {
            this.IP.value = toAddress;
            return false;
        } else {
            return true;
        }

    }

    @Instruction(OpCode.JNA_REGADDRESS, 'JNA', OperandType.REGADDRESS, undefined, ['JBE'])
    private instrJNA_REGADDRESS(toAddress: number): boolean {

        if ((this.SR.carry === 1) || (this.SR.zero === 1)) {
            this.IP.value = toAddress;
            return false;
        } else {
            return true;
        }

    }

    @Instruction(OpCode.JNA_ADDRESS, 'JNA', OperandType.WORD, undefined, ['JBE'])
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
                this.IP.value, this.SP.value, this.SR.value);
        }

        try {
            this.pushWord(this.registersBank.get(toRegister).value);
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value);
        }

        return true;

    }

    @Instruction(OpCode.PUSH_REGADDRESS, 'PUSH', OperandType.REGADDRESS)
    private instrPUSH_REGADDRESS(toAddress: number): boolean {

        let word;

        try {
            word = this.memoryService.loadWord(toAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }

        try {
            this.pushWord(word);
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value);
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
                e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }

        try {
            this.pushWord(word);
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value);
        }

        return true;

    }

    @Instruction(OpCode.PUSH_WORD, 'PUSH', OperandType.WORD)
    private instrPUSH_WORD(word: number): boolean {

        try {
            this.pushWord(word);
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value);
        }

        return true;

    }

    @Instruction(OpCode.PUSHB_REG8, 'PUSHB', OperandType.REGISTER_8BITS)
    private instrPUSHB_REG8(toRegister: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        try {
            this.pushByte(this.registersBank.get(toRegister)[byteToRegister]);
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value);
        }

        return true;

    }

    @Instruction(OpCode.PUSHB_REGADDRESS, 'PUSHB', OperandType.REGADDRESS)
    private instrPUSHB_REGADDRESS(toAddress: number): boolean {

        let byte;

        try {
            byte = this.memoryService.loadByte(toAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }

        try {
            this.pushByte(byte);
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value);
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
                e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }

        try {
            this.pushByte(byte);
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value);
        }

        return true;

    }

    @Instruction(OpCode.PUSHB_BYTE, 'PUSHB', OperandType.BYTE)
    private instrPUSHB_BYTE(byte: number): boolean {

        try {
            this.pushByte(byte);
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value);
        }

        return true;

    }

    @Instruction(OpCode.POP_REG16, 'POP', OperandType.REGISTER_16BITS)
    private instrPOP_REG16(toRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        let word;

        try {
            word = this.popWord();
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value);
        }

        this.registersBank.get(toRegister).value = word;

        return true;

    }

    @Instruction(OpCode.POPB_REG8, 'POPB', OperandType.REGISTER_8BITS)
    private instrPOPB_REG8(toRegister: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.popByte();
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value);
        }

        this.registersBank.get(toRegister)[byteToRegister] = byte;

        return true;

    }

    @Instruction(OpCode.CALL_REGADDRESS, 'CALL', OperandType.REGADDRESS)
    private instrCALL_REGADDRESS(toAddress: number): boolean {

        try {
            this.pushWord(this.nextIP);
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value);
        }

        this.IP.value = toAddress;

        return false;

    }

    @Instruction(OpCode.CALL_ADDRESS, 'CALL', OperandType.WORD)
    private instrCALL_ADDRESS(toAddress: number): boolean {

        try {
            this.pushWord(this.nextIP);
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value);
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
                e.message, this.IP.value, this.SP.value, this.SR.value);
        }

        this.IP.value = newIP;

        return false;

    }

    @Instruction(OpCode.MUL_REG16, 'MUL', OperandType.REGISTER_16BITS)
    private instrMUL_REG(toRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        this.registersBank.get(CPURegisterIndex.A).value =
            this.alu.performMultiplication16Bits(this.registersBank.get(CPURegisterIndex.A).value,
                                     this.registersBank.get(toRegister).value);

        return true;

    }

    @Instruction(OpCode.MUL_REGADDRESS, 'MUL', OperandType.REGADDRESS)
    private instrMUL_REGADDRESS(toAddress: number): boolean {

        let word;

        try {
            word = this.memoryService.loadWord(toAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }

        this.registersBank.get(CPURegisterIndex.A).value =
            this.alu.performMultiplication16Bits(this.registersBank.get(CPURegisterIndex.A).value, word);

        return true;

    }

    @Instruction(OpCode.MUL_ADDRESS, 'MUL', OperandType.ADDRESS)
    private instrMUL_ADDRESS(toAddress: number): boolean {

        let word;

        try {
            word = this.memoryService.loadWord(toAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }

        this.registersBank.get(CPURegisterIndex.A).value =
            this.alu.performMultiplication16Bits(this.registersBank.get(CPURegisterIndex.A).value, word);

        return true;

    }

    @Instruction(OpCode.MUL_WORD, 'MUL', OperandType.WORD)
    private instrMUL_WORD(word: number): boolean {


        this.registersBank.get(CPURegisterIndex.A).value =
            this.alu.performMultiplication16Bits(this.registersBank.get(CPURegisterIndex.A).value,
                word);

        return true;

    }

    @Instruction(OpCode.MULB_REG8, 'MULB', OperandType.REGISTER_8BITS)
    private instrMULB_REG8(toRegister: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        this.registersBank.get(CPURegisterIndex.A)['low'] =
            this.alu.performMultiplication8Bits(this.registersBank.get(CPURegisterIndex.A)['low'],
                this.registersBank.get(toRegister)[byteToRegister]);

        return true;

    }

    @Instruction(OpCode.MULB_REGADDRESS, 'MULB', OperandType.REGADDRESS)
    private instrMULB_REGADDRESS(toAddress: number): boolean {

        let byte;

        try {
            byte = this.memoryService.loadByte(toAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }

        this.registersBank.get(CPURegisterIndex.A)['low'] =
            this.alu.performMultiplication8Bits(this.registersBank.get(CPURegisterIndex.A)['low'], byte);

        return true;

    }

    @Instruction(OpCode.MULB_ADDRESS, 'MULB', OperandType.ADDRESS)
    private instrMULB_ADDRESS(toAddress: number): boolean {

        let byte;

        try {
            byte = this.memoryService.loadByte(toAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }

        this.registersBank.get(CPURegisterIndex.A)['low'] =
            this.alu.performMultiplication8Bits(this.registersBank.get(CPURegisterIndex.A)['low'], byte);

        return true;

    }

    @Instruction(OpCode.MULB_BYTE, 'MULB', OperandType.BYTE)
    private instrMULB_WORD(byte: number): boolean {

        this.registersBank.get(CPURegisterIndex.A)['low'] =
            this.alu.performMultiplication8Bits(this.registersBank.get(CPURegisterIndex.A)['low'],
                byte);

        return true;

    }

    @Instruction(OpCode.DIV_REG16, 'DIV', OperandType.REGISTER_16BITS)
    private instrDIV_REG16(toRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        try {
            this.registersBank.get(CPURegisterIndex.A).value =
                this.alu.performDivision16Bits(this.registersBank.get(CPURegisterIndex.A).value,
                    this.registersBank.get(toRegister).value);
        } catch (error) {
            /* There is only one type of ALU error */
            throw new Exception(ExceptionType.DIVIDE_BY_ZERO,
                error.message, this.IP.value, this.SP.value, this.SR.value);
        }

        return true;

    }

    @Instruction(OpCode.DIV_REGADDRESS, 'DIV', OperandType.REGADDRESS)
    private instrDIV_REGADDRESS(toAddress: number): boolean {

        let word;

        try {
            word = this.memoryService.loadWord(toAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }

        try {
            this.registersBank.get(CPURegisterIndex.A).value =
                this.alu.performDivision16Bits(this.registersBank.get(CPURegisterIndex.A).value, word);
        } catch (error) {
            /* There is only one type of ALU error */
            throw new Exception(ExceptionType.DIVIDE_BY_ZERO,
                error.message, this.IP.value, this.SP.value, this.SR.value);
        }

        return true;

    }

    @Instruction(OpCode.DIV_ADDRESS, 'DIV', OperandType.ADDRESS)
    private instrDIV_ADDRESS(toAddress: number): boolean {

        let word;

        try {
            word = this.memoryService.loadWord(toAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }

        try {
            this.registersBank.get(CPURegisterIndex.A).value =
                this.alu.performDivision16Bits(this.registersBank.get(CPURegisterIndex.A).value, word);
        } catch (error) {
            /* There is only one type of ALU error */
            throw new Exception(ExceptionType.DIVIDE_BY_ZERO,
                error.message, this.IP.value, this.SP.value, this.SR.value);
        }

        return true;

    }

    @Instruction(OpCode.DIV_WORD, 'DIV', OperandType.WORD)
    private instrDIV_WORD(word: number): boolean {

        try {
            this.registersBank.get(CPURegisterIndex.A).value =
                this.alu.performDivision16Bits(this.registersBank.get(CPURegisterIndex.A).value, word);
        } catch (error) {
            /* There is only one type of ALU error */
            throw new Exception(ExceptionType.DIVIDE_BY_ZERO,
                error.message, this.IP.value, this.SP.value, this.SR.value);
        }

        return true;

    }

    @Instruction(OpCode.DIVB_REG8, 'DIVB', OperandType.REGISTER_8BITS)
    private instrDIVB_REG8(toRegister: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        try {
            this.registersBank.get(CPURegisterIndex.A)['low'] =
                this.alu.performDivision8Bits(this.registersBank.get(CPURegisterIndex.A)['low'],
                    this.registersBank.get(toRegister)[byteToRegister]);
        } catch (error) {
            /* There is only one type of ALU error */
            throw new Exception(ExceptionType.DIVIDE_BY_ZERO,
                error.message, this.IP.value, this.SP.value, this.SR.value);
        }

        return true;

    }

    @Instruction(OpCode.DIVB_REGADDRESS, 'DIVB', OperandType.REGADDRESS)
    private instrDIVB_REGADDRESS(toAddress: number): boolean {

        let byte;

        try {
            byte = this.memoryService.loadByte(toAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }

        try {
            this.registersBank.get(CPURegisterIndex.A)['low'] =
                this.alu.performDivision8Bits(this.registersBank.get(CPURegisterIndex.A)['low'], byte);
        } catch (error) {
            /* There is only one type of ALU error */
            throw new Exception(ExceptionType.DIVIDE_BY_ZERO,
                error.message, this.IP.value, this.SP.value, this.SR.value);
        }

        return true;

    }

    @Instruction(OpCode.DIVB_ADDRESS, 'DIVB', OperandType.ADDRESS)
    private instrDIVB_ADDRESS(toAddress: number): boolean {

        let byte;

        try {
            byte = this.memoryService.loadByte(toAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }

        try {
            this.registersBank.get(CPURegisterIndex.A)['low'] =
                this.alu.performDivision8Bits(this.registersBank.get(CPURegisterIndex.A)['low'], byte);
        } catch (error) {
            /* There is only one type of ALU error */
            throw new Exception(ExceptionType.DIVIDE_BY_ZERO,
                error.message, this.IP.value, this.SP.value, this.SR.value);
        }

        return true;

    }

    @Instruction(OpCode.DIVB_BYTE, 'DIVB', OperandType.BYTE)
    private instrDIV_BYTE(byte: number): boolean {

        try {
            this.registersBank.get(CPURegisterIndex.A)['low'] =
                this.alu.performDivision8Bits(this.registersBank.get(CPURegisterIndex.A)['low'], byte);
        } catch (error) {
            /* There is only one type of ALU error */
            throw new Exception(ExceptionType.DIVIDE_BY_ZERO,
                error.message, this.IP.value, this.SP.value, this.SR.value);
        }

        return true;

    }

    @Instruction(OpCode.AND_REG16_WITH_REG16, 'AND', OperandType.REGISTER_16BITS, OperandType.REGISTER_16BITS)
    private instrAND_REG16_WITH_REG16(toRegister: number, fromRegister: number): boolean {


        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        this.registersBank.get(toRegister).value =
            this.alu.performBitwiseAND16Bits(this.registersBank.get(toRegister).value,
                this.registersBank.get(fromRegister).value);

        return true;

    }

    @Instruction(OpCode.AND_REGADDRESS_WITH_REG16, 'AND', OperandType.REGISTER_16BITS, OperandType.REGADDRESS)
    private instrAND_REGADDRESS_WITH_REG16(toRegister: number, fromAddress: number): boolean {


        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        let word;

        try {
            word = this.memoryService.loadWord(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.registersBank.get(toRegister).value =
            this.alu.performBitwiseAND16Bits(this.registersBank.get(toRegister).value, word);

        return true;

    }

    @Instruction(OpCode.AND_ADDRESS_WITH_REG16, 'AND', OperandType.REGISTER_16BITS, OperandType.ADDRESS)
    private instrAND_ADDRESS_WITH_REG16(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        let word;

        try {
            word = this.memoryService.loadWord(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.registersBank.get(toRegister).value =
            this.alu.performBitwiseAND16Bits(this.registersBank.get(toRegister).value, word);

        return true;

    }

    @Instruction(OpCode.AND_WORD_WITH_REG16, 'AND', OperandType.REGISTER_16BITS, OperandType.WORD)
    private instrAND_WORD_WITH_REG(toRegister: number, word: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        this.registersBank.get(toRegister).value =
            this.alu.performBitwiseAND16Bits(this.registersBank.get(toRegister).value, word);

        return true;

    }

    @Instruction(OpCode.ANDB_REG8_WITH_REG8, 'ANDB', OperandType.REGISTER_8BITS, OperandType.REGISTER_8BITS)
    private instrANDB_REG8_WITH_REG8(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService.is8bitsGPR(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);
        const byteFromRegister = CPUService.getByteFrom8bitsGPR(fromRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitwiseAND8Bits(this.registersBank.get(toRegister)[byteToRegister],
                this.registersBank.get(fromRegister)[byteFromRegister]);

        return true;

    }

    @Instruction(OpCode.ANDB_REGADDRESS_WITH_REG8, 'ANDB', OperandType.REGISTER_8BITS, OperandType.REGADDRESS)
    private instrANDB_REGADDRESS_WITH_REG8(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitwiseAND8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);

        return true;

    }

    @Instruction(OpCode.ANDB_ADDRESS_WITH_REG8, 'ANDB', OperandType.REGISTER_8BITS, OperandType.ADDRESS)
    private instrANDB_ADDRESS_WITH_REG8(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitwiseAND8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);

        return true;

    }

    @Instruction(OpCode.ANDB_BYTE_WITH_REG8, 'ANDB', OperandType.REGISTER_8BITS, OperandType.BYTE)
    private instrAND_BYTE_WITH_REG8(toRegister: number, byte: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitwiseAND8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);

        return true;

    }

    @Instruction(OpCode.OR_REG16_WITH_REG16, 'OR', OperandType.REGISTER_16BITS, OperandType.REGISTER_16BITS)
    private instrOR_REG16_WITH_REG16(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        this.registersBank.get(toRegister).value =
            this.alu.performBitwiseOR16Bits(this.registersBank.get(toRegister).value,
                this.registersBank.get(fromRegister).value);

        return true;

    }

    @Instruction(OpCode.OR_REGADDRESS_WITH_REG16, 'OR', OperandType.REGISTER_16BITS, OperandType.REGADDRESS)
    private instrOR_REGADDRESS_WITH_REG16(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        let word;

        try {
            word = this.memoryService.loadWord(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.registersBank.get(toRegister).value =
            this.alu.performBitwiseOR16Bits(this.registersBank.get(toRegister).value, word);

        return true;

    }

    @Instruction(OpCode.OR_ADDRESS_WITH_REG16, 'OR', OperandType.REGISTER_16BITS, OperandType.ADDRESS)
    private instrOR_ADDRESS_WITH_REG16(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        let word;

        try {
            word = this.memoryService.loadWord(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.registersBank.get(toRegister).value =
            this.alu.performBitwiseOR16Bits(this.registersBank.get(toRegister).value, word);

        return true;

    }

    @Instruction(OpCode.OR_WORD_WITH_REG16, 'OR', OperandType.REGISTER_16BITS, OperandType.WORD)
    private instrOR_WORD_WITH_REG(toRegister: number, word: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        this.registersBank.get(toRegister).value =
            this.alu.performBitwiseOR16Bits(this.registersBank.get(toRegister).value, word);

        return true;

    }

    @Instruction(OpCode.ORB_REG8_WITH_REG8, 'ORB', OperandType.REGISTER_8BITS, OperandType.REGISTER_8BITS)
    private instrORB_REG8_WITH_REG8(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService.is8bitsGPR(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);
        const byteFromRegister = CPUService.getByteFrom8bitsGPR(fromRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitwiseOR8Bits(this.registersBank.get(toRegister)[byteToRegister],
                this.registersBank.get(fromRegister)[byteFromRegister]);

        return true;

    }

    @Instruction(OpCode.ORB_REGADDRESS_WITH_REG8, 'ORB', OperandType.REGISTER_8BITS, OperandType.REGADDRESS)
    private instrORB_REGADDRESS_WITH_REG8(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitwiseOR8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);

        return true;

    }

    @Instruction(OpCode.ORB_ADDRESS_WITH_REG8, 'ORB', OperandType.REGISTER_8BITS, OperandType.ADDRESS)
    private instrORB_ADDRESS_WITH_REG8(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitwiseOR8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);

        return true;

    }

    @Instruction(OpCode.ORB_BYTE_WITH_REG8, 'ORB', OperandType.REGISTER_8BITS, OperandType.BYTE)
    private instrORB_BYTE_WITH_REG8(toRegister: number, byte: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitwiseOR8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);

        return true;

    }

    @Instruction(OpCode.XOR_REG16_WITH_REG16, 'XOR', OperandType.REGISTER_16BITS, OperandType.REGISTER_16BITS)
    private instrXOR_REG16_WITH_REG16(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        this.registersBank.get(toRegister).value =
            this.alu.performBitwiseXOR16Bits(this.registersBank.get(toRegister).value,
                this.registersBank.get(fromRegister).value);

        return true;

    }

    @Instruction(OpCode.XOR_REGADDRESS_WITH_REG16, 'XOR', OperandType.REGISTER_16BITS, OperandType.REGADDRESS)
    private instrXOR_REGADDRESS_WITH_REG16(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        let word;

        try {
            word = this.memoryService.loadWord(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.registersBank.get(toRegister).value =
            this.alu.performBitwiseXOR16Bits(this.registersBank.get(toRegister).value, word);

        return true;

    }

    @Instruction(OpCode.XOR_ADDRESS_WITH_REG16, 'XOR', OperandType.REGISTER_16BITS, OperandType.ADDRESS)
    private instrXOR_ADDRESS_WITH_REG16(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        let word;

        try {
            word = this.memoryService.loadWord(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.registersBank.get(toRegister).value =
            this.alu.performBitwiseXOR16Bits(this.registersBank.get(toRegister).value, word);

        return true;

    }

    @Instruction(OpCode.XOR_WORD_WITH_REG16, 'XOR', OperandType.REGISTER_16BITS, OperandType.WORD)
    private instrXOR_WORD_WITH_REG16(toRegister: number, word: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        this.registersBank.get(toRegister).value =
            this.alu.performBitwiseXOR16Bits(this.registersBank.get(toRegister).value, word);

        return true;

    }

    @Instruction(OpCode.XORB_REG8_WITH_REG8, 'XORB', OperandType.REGISTER_8BITS, OperandType.REGISTER_8BITS)
    private instrXORB_REG8_WITH_REG8(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService.is8bitsGPR(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);
        const byteFromRegister = CPUService.getByteFrom8bitsGPR(fromRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitwiseXOR8Bits(this.registersBank.get(toRegister)[byteToRegister],
                this.registersBank.get(fromRegister)[byteFromRegister]);

        return true;

    }

    @Instruction(OpCode.XORB_REGADDRESS_WITH_REG8, 'XORB', OperandType.REGISTER_8BITS, OperandType.REGADDRESS)
    private instrXORB_REGADDRESS_WITH_REG8(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitwiseXOR8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);

        return true;

    }

    @Instruction(OpCode.XORB_ADDRESS_WITH_REG8, 'XORB', OperandType.REGISTER_8BITS, OperandType.ADDRESS)
    private instrXORB_ADDRESS_WITH_REG8(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitwiseXOR8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);

        return true;

    }

    @Instruction(OpCode.XORB_BYTE_WITH_REG8, 'XORB', OperandType.REGISTER_8BITS, OperandType.BYTE)
    private instrXORB_BYTE_WITH_REG8(toRegister: number, byte: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitwiseXOR8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);

        return true;

    }

    @Instruction(OpCode.NOT_REG16, 'NOT', OperandType.REGISTER_16BITS)
    private instrNOT_REG16(toRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        this.registersBank.get(toRegister).value =
            this.alu.performBitwiseNOT16Bits(this.registersBank.get(toRegister).value);

        return true;
    }

    @Instruction(OpCode.NOTB_REG8, 'NOTB', OperandType.REGISTER_8BITS)
    private instrNOT_REG8(toRegister: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitwiseNOT8Bits(this.registersBank.get(toRegister)[byteToRegister]);

        return true;
    }

    @Instruction(OpCode.SHL_REG16_WITH_REG16, 'SHL', OperandType.REGISTER_16BITS, OperandType.REGISTER_16BITS)
    private instrSHL_REG_WITH_REG(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        this.registersBank.get(toRegister).value =
            this.alu.performBitshiftLeft16Bits(this.registersBank.get(toRegister).value,
                this.registersBank.get(fromRegister).value);

        return true;

    }

    @Instruction(OpCode.SHL_REGADDRESS_WITH_REG16, 'SHL', OperandType.REGISTER_16BITS, OperandType.REGADDRESS)
    private instrSHL_REGADDRESS_WITH_REG16(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        let word;

        try {
            word = this.memoryService.loadWord(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.registersBank.get(toRegister).value =
            this.alu.performBitshiftLeft16Bits(this.registersBank.get(toRegister).value, word);

        return true;

    }

    @Instruction(OpCode.SHL_ADDRESS_WITH_REG16, 'SHL', OperandType.REGISTER_16BITS, OperandType.ADDRESS)
    private instrSHL_ADDRESS_WITH_REG16(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        let word;

        try {
            word = this.memoryService.loadWord(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.registersBank.get(toRegister).value =
            this.alu.performBitshiftLeft16Bits(this.registersBank.get(toRegister).value, word);

        return true;

    }

    @Instruction(OpCode.SHL_WORD_WITH_REG16, 'SHL', OperandType.REGISTER_16BITS, OperandType.WORD)
    private instrSHL_WORD_WITH_REG16(toRegister: number, word: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        this.registersBank.get(toRegister).value =
            this.alu.performBitshiftLeft16Bits(this.registersBank.get(toRegister).value, word);

        return true;

    }

    @Instruction(OpCode.SHLB_REG8_WITH_REG8, 'SHLB', OperandType.REGISTER_8BITS, OperandType.REGISTER_8BITS)
    private instrSHLB_REG8_WITH_REG8(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService.is8bitsGPR(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);
        const byteFromRegister = CPUService.getByteFrom8bitsGPR(fromRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitshiftLeft8Bits(this.registersBank.get(toRegister)[byteToRegister],
                this.registersBank.get(fromRegister)[byteFromRegister]);

        return true;

    }

    @Instruction(OpCode.SHLB_REGADDRESS_WITH_REG8, 'SHLB', OperandType.REGISTER_16BITS, OperandType.REGADDRESS)
    private instrSHLB_REGADDRESS_WITH_REG8(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitshiftLeft8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);

        return true;

    }

    @Instruction(OpCode.SHLB_ADDRESS_WITH_REG8, 'SHLB', OperandType.REGISTER_8BITS, OperandType.ADDRESS)
    private instrSHLB_ADDRESS_WITH_REG8(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitshiftLeft8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);

        return true;

    }

    @Instruction(OpCode.SHLB_BYTE_WITH_REG8, 'SHLB', OperandType.REGISTER_8BITS, OperandType.BYTE)
    private instrSHLB_BYTE_WITH_REG8(toRegister: number, byte: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitshiftLeft8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);

        return true;

    }

    @Instruction(OpCode.SHR_REG16_WITH_REG16, 'SHR', OperandType.REGISTER_16BITS, OperandType.REGISTER_16BITS)
    private instrSHR_REG_WITH_REG16(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService.is16bitsGPRorSP(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        this.registersBank.get(toRegister).value =
            this.alu.performBitshiftRight16Bits(this.registersBank.get(toRegister).value,
                this.registersBank.get(fromRegister).value);

        return true;

    }

    @Instruction(OpCode.SHR_REGADDRESS_WITH_REG16, 'SHR', OperandType.REGISTER_16BITS, OperandType.REGADDRESS)
    private instrSHR_REGADDRESS_WITH_REG16(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        let word;

        try {
            word = this.memoryService.loadWord(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.registersBank.get(toRegister).value =
            this.alu.performBitshiftRight16Bits(this.registersBank.get(toRegister).value, word);

        return true;

    }

    @Instruction(OpCode.SHR_ADDRESS_WITH_REG16, 'SHR', OperandType.REGISTER_16BITS, OperandType.ADDRESS)
    private instrSHR_ADDRESS_WITH_REG16(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        let word;

        try {
            word = this.memoryService.loadWord(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.registersBank.get(toRegister).value =
            this.alu.performBitshiftRight16Bits(this.registersBank.get(toRegister).value, word);

        return true;

    }

    @Instruction(OpCode.SHR_WORD_WITH_REG16, 'SHR', OperandType.REGISTER_16BITS, OperandType.WORD)
    private instrSHR_WORD_WITH_REG16(toRegister: number, word: number): boolean {

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        this.registersBank.get(toRegister).value =
            this.alu.performBitshiftRight16Bits(this.registersBank.get(toRegister).value, word);

        return true;

    }

    @Instruction(OpCode.SHRB_REG8_WITH_REG8, 'SHRB', OperandType.REGISTER_8BITS, OperandType.REGISTER_8BITS)
    private instrSHRB_REG8_WITH_REG8(toRegister: number, fromRegister: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }
        if (CPUService.is8bitsGPR(fromRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid second operand: register index ${fromRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);
        const byteFromRegister = CPUService.getByteFrom8bitsGPR(fromRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitshiftRight8Bits(this.registersBank.get(toRegister)[byteToRegister],
                this.registersBank.get(fromRegister)[byteFromRegister]);

        return true;

    }

    @Instruction(OpCode.SHRB_REGADDRESS_WITH_REG8, 'SHRB', OperandType.REGISTER_8BITS, OperandType.REGADDRESS)
    private instrSHRB_REGADDRESS_WITH_REG8(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitshiftRight8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);

        return true;

    }

    @Instruction(OpCode.SHRB_ADDRESS_WITH_REG8, 'SHRB', OperandType.REGISTER_8BITS, OperandType.ADDRESS)
    private instrSHRB_ADDRESS_WITH_REG8(toRegister: number, fromAddress: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        let byte;

        try {
            byte = this.memoryService.loadByte(fromAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, fromAddress);
        }

        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitshiftRight8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);

        return true;

    }

    @Instruction(OpCode.SHRB_BYTE_WITH_REG8, 'SHRB', OperandType.REGISTER_8BITS, OperandType.BYTE)
    private instrSHRB_BYTE_WITH_REG8(toRegister: number, byte: number): boolean {

        if (CPUService.is8bitsGPR(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const byteToRegister = CPUService.getByteFrom8bitsGPR(toRegister);

        this.registersBank.get(toRegister)[byteToRegister] =
            this.alu.performBitshiftRight8Bits(this.registersBank.get(toRegister)[byteToRegister], byte);

        return true;

    }

    @Instruction(OpCode.CLI, 'CLI')
    private instrCLI(): boolean {

        if (this.SR.supervisor === 0) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION, `Invalid use of CLI when in user mode`,
                this.IP.value, this.SP.value, this.SR.value);
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
                this.IP.value, this.SP.value, this.SR.value);
        }

        this.SR.irqMask = 1;

        return true;

    }

    @Instruction(OpCode.IRET, 'IRET', undefined, undefined, ['SRET'])
    private instrIRET(): boolean {

        if (this.SR.supervisor === 0) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION, `Invalid use of privileged instruction when in user mode`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        let newIP, newSP, newSR;

        try {
            newIP = this.popWord();
            newSP = this.popWord();
            newSR = this.popWord();
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value);
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
                this.IP.value, this.SP.value, this.SR.value);
        }

        const currentSR = this.SR.value;

        this.SR.supervisor = 1;

        this.registersBank.set(CPURegisterIndex.SP, this.supervisorSP);

        try {
            this.pushWord(currentSR);
            this.pushWord(this.userSP.value);
            this.pushWord(this.nextIP);
        } catch (e) {
            throw new Exception(ExceptionType.STACK_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value);
        }

        this.IP.value = SYSCALL_VECTOR_ADDRESS;

        return false;

    }

    @Instruction(OpCode.IN_REG16, 'IN', OperandType.REGISTER_16BITS)
    private instrIN_REG16(toRegister: number) {

        if (this.SR.supervisor === 0) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION, `Invalid use of STI when in user mode`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const register_address = this.registersBank.get(toRegister).value;
        this.registersBank.get(CPURegisterIndex.A).value =
            this.ioRegMapService.load(register_address);

        return true;

    }

    @Instruction(OpCode.IN_REGADDRESS, 'IN', OperandType.REGADDRESS)
    private instrIN_REGADDRESS(toAddress: number) {

        if (this.SR.supervisor === 0) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION, `Invalid use of STI when in user mode`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        let register_address;

        try {
            register_address = this.memoryService.loadWord(toAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }

        this.registersBank.get(CPURegisterIndex.A).value =
            this.ioRegMapService.load(register_address);

        return true;

    }

    @Instruction(OpCode.IN_ADDRESS, 'IN', OperandType.ADDRESS)
    private instrIN_ADDRESS(toAddress: number) {

        if (this.SR.supervisor === 0) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION, `Invalid use of STI when in user mode`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        let register_address;

        try {
            register_address = this.memoryService.loadWord(toAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }

        this.registersBank.get(CPURegisterIndex.A).value =
            this.ioRegMapService.load(register_address);

        return true;

    }

    @Instruction(OpCode.IN_WORD, 'IN', OperandType.WORD)
    private instrIN_WORD(word: number) {

        if (this.SR.supervisor === 0) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION, `Invalid use of STI when in user mode`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        this.registersBank.get(CPURegisterIndex.A).value =
            this.ioRegMapService.load(word);

        return true;

    }

    @Instruction(OpCode.OUT_REG16, 'OUT', OperandType.REGISTER_16BITS)
    private instrOUT_REG16(toRegister: number) {

        if (this.SR.supervisor === 0) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION, `Invalid use of STI when in user mode`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        if (CPUService.is16bitsGPRorSP(toRegister) === false) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION,
                `Invalid first operand: register index ${toRegister} out of bounds`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const register_address = this.registersBank.get(toRegister).value;
        const value = this.registersBank.get(CPURegisterIndex.A).value;
        this.ioRegMapService.store(register_address, value);

        return true;

    }

    @Instruction(OpCode.OUT_REGADDRESS, 'OUT', OperandType.REGADDRESS)
    private instrOUT_REGADDRESS(toAddress: number) {

        if (this.SR.supervisor === 0) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION, `Invalid use of STI when in user mode`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        let register_address;

        try {
            register_address = this.memoryService.loadWord(toAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }

        const value = this.registersBank.get(CPURegisterIndex.A).value;

        this.ioRegMapService.store(register_address, value);

        return true;

    }

    @Instruction(OpCode.OUT_ADDRESS, 'OUT', OperandType.ADDRESS)
    private instrOUT_ADDRESS(toAddress: number) {

        if (this.SR.supervisor === 0) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION, `Invalid use of STI when in user mode`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        let register_address;

        try {
            register_address = this.memoryService.loadWord(toAddress);
        } catch (e) {
            throw new Exception(ExceptionType.MEMORY_ACCESS_ERROR,
                e.message, this.IP.value, this.SP.value, this.SR.value, toAddress);
        }

        const value = this.registersBank.get(CPURegisterIndex.A).value;

        this.ioRegMapService.store(register_address, value);

        return true;

    }

    @Instruction(OpCode.OUT_WORD, 'OUT', OperandType.WORD)
    private instrOUT_WORD(word: number) {

        if (this.SR.supervisor === 0) {
            throw new Exception(ExceptionType.ILLEGAL_INSTRUCTION, `Invalid use of STI when in user mode`,
                this.IP.value, this.SP.value, this.SR.value);
        }

        const value = this.registersBank.get(CPURegisterIndex.A).value;

        this.ioRegMapService.store(word, value);

        return true;

    }

}
