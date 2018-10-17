import { Injectable } from '@angular/core';

import { Subject, Observable } from 'rxjs';

import { IORegisterOperation, IORegMapService,
         IORegisterType, IORegisterOperationType,
         IORegisterOperationParamsReadWrite } from './ioregmap.service';

import { CPUService } from './cpu.service';

import { EventsLogService, SystemEvent } from './events-log.service';

const IRQMASK_REGISTER_ADDRESS = 0;
const IRQSTATUS_REGISTER_ADDRESS = 1;
const IRQEOI_REGISTER_ADDRESS = 2;

export enum IrqCtrlOperationType {

    RESET = 0,
    MASK_IRQ = 1,
    UNMASK_IRQ = 2,
    END_OF_IRQ = 3,
    IRQ_TRIGGER_EDGE = 4,
    IRQ_RAISE_LEVEL = 5,
    IRQ_LOWER_LEVEL = 6

}

export interface IrqCtrlOperationParams {

    irqNumber: number;

}

enum IrqCtrlOperationState {

    IN_PROGRESS = 0,
    FINISHED = 1

}

export class IrqCtrlOperation implements SystemEvent {

    public operationType: IrqCtrlOperationType;
    public data: IrqCtrlOperationParams;
    public state: IrqCtrlOperationState;

    constructor(operationType: IrqCtrlOperationType, data?: IrqCtrlOperationParams,
                state?: IrqCtrlOperationState) {

        this.operationType = operationType;
        this.data = data;
        this.state = state;

    }

    toString(): string {

        let ret;

        switch (this.operationType) {
            case IrqCtrlOperationType.RESET:
                ret = `IRQC: Reset control unit`;
                break;
            case IrqCtrlOperationType.MASK_IRQ:
                ret = `IRQC: Masked interrupt ${this.data.irqNumber}`;
                break;
            case IrqCtrlOperationType.UNMASK_IRQ:
                ret = `IRQC: Unmasked interrupt ${this.data.irqNumber}`;
                break;
            case IrqCtrlOperationType.END_OF_IRQ:
                ret = `IRQC: Signalled end of interrupt ${this.data.irqNumber}`;
                break;
            case IrqCtrlOperationType.IRQ_TRIGGER_EDGE:
                ret = `IRQC: Signalled edge-triggered interrupt ${this.data.irqNumber}`;
                break;
            case IrqCtrlOperationType.IRQ_RAISE_LEVEL:
                ret = `IRQC: Risen level-triggered interrupt ${this.data.irqNumber}`;
                break;
            case IrqCtrlOperationType.IRQ_LOWER_LEVEL:
                ret = `IRQC: Lowered level-triggered interrupt ${this.data.irqNumber}`;
                break;
            default:
                break;
        }

        return ret;

    }

}



@Injectable()
export class IrqCtrlService {

    private irqMaskRegister = 0; // IRQMASK register (address: 0x0000)
    private irqStatusRegister = 0; // IRQSTATUS register (address: 0x0001)
    private irqLevelRegister = 0; // IRQLEVEL register (internal)

    private interruptOutput = false;

    protected irqCtrlOperationSource = new Subject<IrqCtrlOperation>();
    public irqCtrlOperation$: Observable<IrqCtrlOperation>;

    private static getNewSets(previousValue: number, newValue: number): Array<number> {

        const ret = [];
        const changes = previousValue ^ newValue;

        for (let i = 0; i < 16; i++) {

            if (((previousValue & (1 << i)) === 0) && ((changes & (1 << i)) !== 0)) {
                ret.push(i);
            }

        }

        return ret;

    }

    private static getNewClears(previousValue: number, newValue: number): Array<number> {

        const ret = [];
        const changes = previousValue ^ newValue;

        for (let i = 0; i < 16; i++) {

            if (((previousValue & (1 << i)) !== 0) && ((changes & (1 << i)) !== 0)) {
                ret.push(i);
            }

        }

        return ret;

    }

    constructor(private ioRegMapService: IORegMapService, private cpuService: CPUService,
                private eventsLogService: EventsLogService) {

        ioRegMapService.addRegister('IRQMASK', IRQMASK_REGISTER_ADDRESS, 0, IORegisterType.READ_WRITE,
            (op) => this.processRegisterOperation(op), 'Interrupt Controller Mask Register');
        ioRegMapService.addRegister('IRQSTATUS', IRQSTATUS_REGISTER_ADDRESS, 0, IORegisterType.READ_ONLY,
            (op) => this.processRegisterOperation(op), 'Interrupt Controller Status Register');
        ioRegMapService.addRegister('IRQEOI', IRQEOI_REGISTER_ADDRESS, 0, IORegisterType.READ_WRITE,
            (op) => this.processRegisterOperation(op), 'End of Interrupt Register');

        this.irqCtrlOperation$ = this.irqCtrlOperationSource.asObservable();

    }

    protected publishIrqCtrlOperation(operation: IrqCtrlOperation, flushGroups: boolean = false) {

        this.eventsLogService.log(operation, flushGroups);
        this.irqCtrlOperationSource.next(operation);

    }

    protected publishIrqCtrlOperationStart(operation: IrqCtrlOperation) {

        operation.state = IrqCtrlOperationState.IN_PROGRESS;
        this.eventsLogService.startEventGroup(operation);
        this.irqCtrlOperationSource.next(operation);

    }

    protected publishIrqCtrlOperationEnd(operation: IrqCtrlOperation) {

        operation.state = IrqCtrlOperationState.FINISHED;
        this.eventsLogService.endEventGroup(operation);
        this.irqCtrlOperationSource.next(operation);

    }


    private processWriteOperation(address: number, value: number) {

        let clears;

        switch (address) {
            case IRQMASK_REGISTER_ADDRESS:
                const sets = IrqCtrlService.getNewSets(this.irqMaskRegister, value);
                clears = IrqCtrlService.getNewClears(this.irqMaskRegister, value);
                sets.forEach((irqNumber) => {
                   this.publishIrqCtrlOperation(new IrqCtrlOperation(IrqCtrlOperationType.UNMASK_IRQ, {irqNumber: irqNumber}));
                });
                clears.forEach((irqNumber) => {
                    this.publishIrqCtrlOperation(new IrqCtrlOperation(IrqCtrlOperationType.MASK_IRQ, {irqNumber: irqNumber}));
                });

                this.irqMaskRegister = value;
                break;
            case IRQSTATUS_REGISTER_ADDRESS:
                break;
            case IRQEOI_REGISTER_ADDRESS:
                const previousStatus = this.irqStatusRegister;
                this.irqStatusRegister ^= value;
                this.irqStatusRegister |= this.irqLevelRegister;
                clears = IrqCtrlService.getNewClears(previousStatus, this.irqStatusRegister);
                clears.forEach((irqNumber) => {
                    this.publishIrqCtrlOperation(new IrqCtrlOperation(IrqCtrlOperationType.END_OF_IRQ, {irqNumber: irqNumber}));
                });
                this.ioRegMapService.store(IRQSTATUS_REGISTER_ADDRESS, this.irqStatusRegister, false, false);
                break;
        }

        if ((this.irqStatusRegister & this.irqMaskRegister) !== 0) {

            if (this.interruptOutput === false) {
                this.interruptOutput = true;
                this.cpuService.raiseInterrupt();
            }

        } else if (this.interruptOutput === true) {
            this.interruptOutput = false;
            this.cpuService.lowerInterrupt();
        }

    }

    private processRegisterOperation(ioRegisterOperation: IORegisterOperation) {

        switch (ioRegisterOperation.operationType) {
            case IORegisterOperationType.READ:
                break;
            case IORegisterOperationType.WRITE:
                this.processWriteOperation(
                    (<IORegisterOperationParamsReadWrite>ioRegisterOperation.data).address,
                    (<IORegisterOperationParamsReadWrite>ioRegisterOperation.data).value);
                break;
        }

    }

    public raiseHardwareInterrupt(irqNumber: number) {

        if (irqNumber < 0 || irqNumber > 15 || isNaN(irqNumber)) {
            throw Error(`Invalid interrupt number ${irqNumber}`);
        }

        this.irqLevelRegister |= (1 << irqNumber);
        this.irqStatusRegister |= (1 << irqNumber);

        const operation = new IrqCtrlOperation(IrqCtrlOperationType.IRQ_RAISE_LEVEL, {irqNumber: irqNumber});

        this.publishIrqCtrlOperationStart(operation);

        this.ioRegMapService.store(IRQSTATUS_REGISTER_ADDRESS, this.irqStatusRegister, false, false);

        this.publishIrqCtrlOperationEnd(operation);

        if (((this.irqStatusRegister & this.irqMaskRegister) !== 0) &&
            (this.interruptOutput === false)) {
                this.interruptOutput = true;
                this.cpuService.raiseInterrupt();
        }

    }

    public lowerHardwareInterrupt(irqNumber: number) {

        if (irqNumber < 0 || irqNumber > 15 || isNaN(irqNumber)) {
            throw Error(`Invalid interrupt number ${irqNumber}`);
        }

        this.irqLevelRegister &= ~(1 << irqNumber);

        this.publishIrqCtrlOperation(new IrqCtrlOperation(IrqCtrlOperationType.IRQ_LOWER_LEVEL, {irqNumber: irqNumber}));

    }

    public triggerHardwareInterrupt(irqNumber: number) {

        if (irqNumber < 0 || irqNumber > 15 || isNaN(irqNumber)) {
            throw Error(`Invalid interrupt number ${irqNumber}`);
        }

        this.irqStatusRegister |= (1 << irqNumber);

        const operation = new IrqCtrlOperation(IrqCtrlOperationType.IRQ_TRIGGER_EDGE, {irqNumber: irqNumber});

        this.publishIrqCtrlOperationStart(operation);

        this.ioRegMapService.store(IRQSTATUS_REGISTER_ADDRESS, this.irqStatusRegister, false, false);

        this.publishIrqCtrlOperationEnd(operation);

        if (((this.irqStatusRegister & this.irqMaskRegister) !== 0) &&
            (this.interruptOutput === false)) {
                this.interruptOutput = true;
                this.cpuService.raiseInterrupt();
        }

    }

    public reset() {

        const operation = new IrqCtrlOperation(IrqCtrlOperationType.RESET);

        this.publishIrqCtrlOperationStart(operation);

        this.irqMaskRegister = 0; // IRQMASK register (address: 0x0000)
        this.irqStatusRegister = 0; // IRQSTATUS register (address: 0x0001)
        this.irqLevelRegister = 0; // IRQLEVEL register (internal)

        this.ioRegMapService.store(IRQMASK_REGISTER_ADDRESS, 0, false, false);
        this.ioRegMapService.store(IRQSTATUS_REGISTER_ADDRESS, 0, false, false);
        this.ioRegMapService.store(IRQEOI_REGISTER_ADDRESS, 0, false, false);

        this.interruptOutput = false;

        this.publishIrqCtrlOperationEnd(operation);

    }

}
