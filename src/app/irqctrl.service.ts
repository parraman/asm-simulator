import { Injectable } from '@angular/core';

import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';

import { IORegisterOperation, IORegMapService,
         IORegisterType, IORegisterOperationType } from './ioregmap.service';

const IRQMASK_REGISTER_ADDRESS = 0;
const IRQSTATUS_REGISTER_ADDRESS = 1;


@Injectable()
export class IrqCtrlService {

    private irqMaskRegister = 0; // IRQMASK register (address: 0x0000)
    private irqStatusRegister = 0; // IRQSTATUS register (address: 0x0001)

    private ioRegisterOperationSource = new Subject<IORegisterOperation>();

    private ioRegisterOperation$: Observable<IORegisterOperation>;

    constructor(private ioRegMapService: IORegMapService) {

        this.ioRegisterOperation$ = this.ioRegisterOperationSource.asObservable();

        this.ioRegisterOperation$.subscribe(
            (ioRegisterOperation) => this.processRegisterOperation(ioRegisterOperation)
        );

        ioRegMapService.addRegister('IRQMASK', IRQMASK_REGISTER_ADDRESS, 0, IORegisterType.READ_WRITE,
            this.ioRegisterOperationSource, 'Interrupt Controller Mask Register');
        ioRegMapService.addRegister('IRQSTATUS', IRQSTATUS_REGISTER_ADDRESS, 0, IORegisterType.READ_WRITE,
            this.ioRegisterOperationSource, 'Interrupt Controller Status Register');

    }

    private processWriteOperation(address: number, value: number) {

        switch (address) {
            case IRQMASK_REGISTER_ADDRESS:
                this.irqMaskRegister = value;
                break;
            case IRQSTATUS_REGISTER_ADDRESS:
                this.irqStatusRegister = value;

                /* TODO: trigger CPU interrupt */
                /*

                if ((this.irqStatusRegister & this.irqMaskRegister) !== 0) {

                }
                */

                break;
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

    public triggerHardwareInterrupt(irqNumber: number) {

        if (irqNumber < 0 || irqNumber > 15 || isNaN(irqNumber)) {
            throw Error(`Invalid interrupt number ${irqNumber}`);
        }

        const irqMask = (1 << irqNumber);

        this.ioRegMapService.store(IRQSTATUS_REGISTER_ADDRESS, irqMask);

    }

}
