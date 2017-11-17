import { Injectable } from '@angular/core';

import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';

import { IORegisterOperation, IORegMapService,
         IORegisterType, IORegisterOperationType } from './ioregmap.service';
import {CPUService} from "./cpu.service";

const IRQMASK_REGISTER_ADDRESS = 0;
const IRQSTATUS_REGISTER_ADDRESS = 1;
const IRQEOI_REGISTER_ADDRESS = 2;


@Injectable()
export class IrqCtrlService {

    private irqMaskRegister = 0; // IRQMASK register (address: 0x0000)
    private irqStatusRegister = 0; // IRQSTATUS register (address: 0x0001)
    private irqLevelRegister = 0; // IRQLEVEL register (internal)

    private ioRegisterOperationSource = new Subject<IORegisterOperation>();

    private ioRegisterOperation$: Observable<IORegisterOperation>;

    private interruptOutput = false;

    constructor(private ioRegMapService: IORegMapService, private cpuService: CPUService) {

        this.ioRegisterOperation$ = this.ioRegisterOperationSource.asObservable();

        this.ioRegisterOperation$.subscribe(
            (ioRegisterOperation) => this.processRegisterOperation(ioRegisterOperation)
        );

        ioRegMapService.addRegister('IRQMASK', IRQMASK_REGISTER_ADDRESS, 0, IORegisterType.READ_WRITE,
            this.ioRegisterOperationSource, 'Interrupt Controller Mask Register');
        ioRegMapService.addRegister('IRQSTATUS', IRQSTATUS_REGISTER_ADDRESS, 0, IORegisterType.READ_ONLY,
            this.ioRegisterOperationSource, 'Interrupt Controller Status Register');
        ioRegMapService.addRegister('IRQEOI', IRQEOI_REGISTER_ADDRESS, 0, IORegisterType.READ_WRITE,
            this.ioRegisterOperationSource, 'End of Interrupt Register');

    }

    private processWriteOperation(address: number, value: number) {

        switch (address) {
            case IRQMASK_REGISTER_ADDRESS:
                this.irqMaskRegister = value;
                break;
            case IRQSTATUS_REGISTER_ADDRESS:
                break;
            case IRQEOI_REGISTER_ADDRESS:
                this.irqStatusRegister &= ~value;
                this.irqStatusRegister |= this.irqLevelRegister;
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
                    ioRegisterOperation.data.get('address'),
                    ioRegisterOperation.data.get('value'));
                break;
        }

    }

    public raiseHardwareInterrupt(irqNumber: number) {

        if (irqNumber < 0 || irqNumber > 15 || isNaN(irqNumber)) {
            throw Error(`Invalid interrupt number ${irqNumber}`);
        }

        this.irqLevelRegister |= (1 << irqNumber);
        this.irqStatusRegister |= (1 << irqNumber);

        this.ioRegMapService.store(IRQSTATUS_REGISTER_ADDRESS, this.irqStatusRegister, false, false);

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

    }

    public triggerHardwareInterrupt(irqNumber: number) {

        if (irqNumber < 0 || irqNumber > 15 || isNaN(irqNumber)) {
            throw Error(`Invalid interrupt number ${irqNumber}`);
        }

        this.irqStatusRegister |= (1 << irqNumber);

        this.ioRegMapService.store(IRQSTATUS_REGISTER_ADDRESS, this.irqStatusRegister, false, false);

        if (((this.irqStatusRegister & this.irqMaskRegister) !== 0) &&
            (this.interruptOutput === false)) {
                this.interruptOutput = true;
                this.cpuService.raiseInterrupt();
        }

    }

    public reset() {

        this.irqMaskRegister = 0; // IRQMASK register (address: 0x0000)
        this.irqStatusRegister = 0; // IRQSTATUS register (address: 0x0001)
        this.irqLevelRegister = 0; // IRQLEVEL register (internal)

        this.ioRegMapService.store(IRQMASK_REGISTER_ADDRESS, 0, false, false);
        this.ioRegMapService.store(IRQSTATUS_REGISTER_ADDRESS, 0, false, false);
        this.ioRegMapService.store(IRQEOI_REGISTER_ADDRESS, 0, false, false);

        this.interruptOutput = false;


    }

}
