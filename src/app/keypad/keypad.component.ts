import { Component, OnInit } from '@angular/core';
import { IrqCtrlService } from '../irqctrl.service';
import { IORegMapService, IORegisterOperation, IORegisterType,
         IORegisterOperationType} from '../ioregmap.service';

import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';


const KPDSTATUS_REGISTER_ADDRESS = 5;
const KPDDATA_REGISTER_ADDRESS = 6;


@Component({
    selector: 'app-keypad',
    templateUrl: './keypad.component.html'
})
export class KeypadComponent implements OnInit {

    private kpdStatusRegister = 0; // KPDSTATUS register (address: 0x0002)
    private kpdDataRegister = 0;

    private interruptOutput = false;

    private ioRegisterOperationSource = new Subject<IORegisterOperation>();

    private ioRegisterOperation$: Observable<IORegisterOperation>;

    constructor(private ioRegMapService: IORegMapService,
                private irqCtrlService: IrqCtrlService) {

        this.ioRegisterOperation$ = this.ioRegisterOperationSource.asObservable();

        this.ioRegisterOperation$.subscribe(
            (ioRegisterOperation) => this.processRegisterOperation(ioRegisterOperation)
        );

    }

    ngOnInit() {

        this.ioRegMapService.addRegister('KPDSTATUS', KPDSTATUS_REGISTER_ADDRESS, 0,
            IORegisterType.READ_ONLY, this.ioRegisterOperationSource, 'Keypad Status Register');
        this.ioRegMapService.addRegister('KPDDATA', KPDDATA_REGISTER_ADDRESS, 0,
            IORegisterType.READ_ONLY, this.ioRegisterOperationSource, 'Keypad Data Register');

    }

    private processReadOperation(address: number) {

        switch (address) {

            case KPDSTATUS_REGISTER_ADDRESS:
                break;
            case KPDDATA_REGISTER_ADDRESS:
                this.kpdStatusRegister = 0;

                this.ioRegMapService.store(KPDSTATUS_REGISTER_ADDRESS, 0, false, false);

                if (this.interruptOutput === true) {
                    this.interruptOutput = false;
                    this.irqCtrlService.lowerHardwareInterrupt(0);
                }

                break;
        }

    }

    private processRegisterOperation(ioRegisterOperation: IORegisterOperation) {

        switch (ioRegisterOperation.operationType) {
            case IORegisterOperationType.READ:
                this.processReadOperation(
                    ioRegisterOperation.data.get('address'));
                break;
            case IORegisterOperationType.WRITE:
                break;
        }

    }

    public processKey(key: number) {

        if (this.kpdStatusRegister === 0) {

            this.kpdDataRegister = key;
            this.kpdStatusRegister = 1;

            this.ioRegMapService.store(KPDDATA_REGISTER_ADDRESS, key, false, false);
            this.ioRegMapService.store(KPDSTATUS_REGISTER_ADDRESS, 1, false, false);

        } else {

            this.kpdStatusRegister = 3;

            this.ioRegMapService.store(KPDSTATUS_REGISTER_ADDRESS, 3, false, false);

        }

        if (((this.kpdStatusRegister & 0x1) !== 0) && (this.interruptOutput === false)) {
            this.interruptOutput = true;
            this.irqCtrlService.raiseHardwareInterrupt(0);
        }

    }

    public reset() {

        this.kpdStatusRegister = 0;
        this.kpdDataRegister = 0;
        this.interruptOutput = false;

        this.ioRegMapService.store(KPDSTATUS_REGISTER_ADDRESS, 0, false, false);
        this.ioRegMapService.store(KPDDATA_REGISTER_ADDRESS, 0, false, false);

    }

}
