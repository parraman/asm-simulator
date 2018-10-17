import { Component, OnInit } from '@angular/core';
import { IrqCtrlService } from '../irqctrl.service';
import { IORegMapService, IORegisterOperation, IORegisterType,
         IORegisterOperationType} from '../ioregmap.service';

import { Subject, Observable } from 'rxjs';

import { Utils } from '../utils';
import { EventsLogService, SystemEvent } from '../events-log.service';


const KPDSTATUS_REGISTER_ADDRESS = 5;
const KPDDATA_REGISTER_ADDRESS = 6;

export enum KeypadOperationType {

    RESET = 0,
    KEY_PRESSED = 1,
    OVERLOAD = 2,
    DATA_READ = 3

}

export interface KeypadOperationParams {

    value: number;

}

enum KeypadOperationState {

    IN_PROGRESS = 0,
    FINISHED = 1

}

export class KeypadOperation implements SystemEvent {

    public operationType: KeypadOperationType;
    public data: KeypadOperationParams;
    public state: KeypadOperationState;

    constructor(operationType: KeypadOperationType, data?: KeypadOperationParams,
                state?: KeypadOperationState) {

        this.operationType = operationType;
        this.data = data;
        this.state = state;

    }

    toString(): string {

        let ret;

        switch (this.operationType) {
            case KeypadOperationType.RESET:
                ret = `KPD: Reset keypad`;
                break;
            case KeypadOperationType.KEY_PRESSED:
                ret = `KPD: Key pressed -> ${this.data.value}`;
                break;
            case KeypadOperationType.OVERLOAD:
                ret = `KPD: Overload on pressing new key`;
                break;
            case KeypadOperationType.DATA_READ:
                ret = `KPD: Clear status on KPDDATA register read`;
                break;
            default:
                break;
        }

        return ret;

    }

}


@Component({
    selector: 'app-keypad',
    templateUrl: './keypad.component.html'
})
export class KeypadComponent implements OnInit {

    private kpdStatusRegister = 0; // KPDSTATUS register (address: 0x0002)
    private kpdDataRegister = 0;

    private interruptOutput = false;

    private keypadOperationSource = new Subject<KeypadOperation>();

    private keypadOperation$: Observable<KeypadOperation>;

    constructor(private ioRegMapService: IORegMapService,
                private irqCtrlService: IrqCtrlService,
                private eventsLogService: EventsLogService) {

        this.keypadOperation$ = this.keypadOperationSource.asObservable();

    }

    private publishKeypadOperation(operation: KeypadOperation, flushGroups: boolean = false) {

        this.eventsLogService.log(operation, flushGroups);
        this.keypadOperationSource.next(operation);

    }

    protected publishKeypadOperationStart(operation: KeypadOperation) {

        operation.state = KeypadOperationState.IN_PROGRESS;
        this.eventsLogService.startEventGroup(operation);
        this.keypadOperationSource.next(operation);

    }

    protected publishKeypadOperationEnd(operation: KeypadOperation) {

        operation.state = KeypadOperationState.FINISHED;
        this.eventsLogService.endEventGroup(operation);
        this.keypadOperationSource.next(operation);

    }

    ngOnInit() {

        this.ioRegMapService.addRegister('KPDSTATUS', KPDSTATUS_REGISTER_ADDRESS, 0,
            IORegisterType.READ_ONLY, (op) => this.processRegisterOperation(op), 'Keypad Status Register');
        this.ioRegMapService.addRegister('KPDDATA', KPDDATA_REGISTER_ADDRESS, 0,
            IORegisterType.READ_ONLY, (op) => this.processRegisterOperation(op), 'Keypad Data Register');

    }

    private processReadOperation(address: number) {

        switch (address) {

            case KPDSTATUS_REGISTER_ADDRESS:
                break;
            case KPDDATA_REGISTER_ADDRESS:
                this.kpdStatusRegister = 0;

                const operation = new KeypadOperation(KeypadOperationType.DATA_READ);

                this.publishKeypadOperationStart(operation);

                this.ioRegMapService.store(KPDSTATUS_REGISTER_ADDRESS, 0, false, false);

                this.publishKeypadOperationEnd(operation);

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
                    ioRegisterOperation.data.address);
                break;
            case IORegisterOperationType.WRITE:
                break;
        }

    }

    public processKey(key: string) {

        let operation;

        if (this.kpdStatusRegister === 0) {

            this.kpdDataRegister = key.charCodeAt(0);
            this.kpdStatusRegister = 1;

            operation = new KeypadOperation(KeypadOperationType.KEY_PRESSED, { value: key.charCodeAt(0) });

            this.publishKeypadOperationStart(operation);

            this.ioRegMapService.store(KPDDATA_REGISTER_ADDRESS, key.charCodeAt(0), false, false);
            this.ioRegMapService.store(KPDSTATUS_REGISTER_ADDRESS, 1, false, false);

            this.publishKeypadOperationEnd(operation);


        } else {

            this.kpdStatusRegister = 3;

            operation = new KeypadOperation(KeypadOperationType.OVERLOAD);

            this.publishKeypadOperationStart(operation);

            this.ioRegMapService.store(KPDSTATUS_REGISTER_ADDRESS, 3, false, false);

            this.publishKeypadOperationEnd(operation);

        }

        if (((this.kpdStatusRegister & 0x1) !== 0) && (this.interruptOutput === false)) {
            this.interruptOutput = true;
            this.irqCtrlService.raiseHardwareInterrupt(0);
        }

    }

    public reset() {

        const operation = new KeypadOperation(KeypadOperationType.RESET);

        this.publishKeypadOperationStart(operation);

        this.kpdStatusRegister = 0;
        this.kpdDataRegister = 0;
        this.interruptOutput = false;

        this.ioRegMapService.store(KPDSTATUS_REGISTER_ADDRESS, 0, false, false);
        this.ioRegMapService.store(KPDDATA_REGISTER_ADDRESS, 0, false, false);

        this.publishKeypadOperationEnd(operation);

    }

}
