import { Injectable } from '@angular/core';
import { IrqCtrlService } from './irqctrl.service';
import { IORegMapService, IORegisterOperation, IORegisterType,
    IORegisterOperationType} from './ioregmap.service';

import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';
import { CPUService} from './cpu.service';
import { Subscription } from 'rxjs/Subscription';


const TMRPRELOAD_REGISTER_ADDRESS = 3;
const TMRCOUNTER_REGISTER_ADDRESS = 4;

enum TimerState {

    RESET = 0,
    PRELOADED = 1,
    RUNNING = 2,
    DEPLETED = 3

}

@Injectable()
export class TimerService {

    private state: TimerState = TimerState.RESET;

    private timerPreloadRegister = 0; // TMRPRELD register (address: 0x0005)
    private timerCounterRegister = 0; // TMRCTR register (address: 0x0006)

    private ioRegisterOperationSource = new Subject<IORegisterOperation>();

    private ioRegisterOperation$: Observable<IORegisterOperation>;

    private cpuConsumeTicksSubscription: Subscription;

    constructor(private ioRegMapService: IORegMapService,
                private irqCtrlService: IrqCtrlService,
                private cpuService: CPUService) {

        this.ioRegisterOperation$ = this.ioRegisterOperationSource.asObservable();

        this.ioRegisterOperation$.subscribe(
            (ioRegisterOperation) => this.processRegisterOperation(ioRegisterOperation)
        );

        ioRegMapService.addRegister('TMRPRELOAD', TMRPRELOAD_REGISTER_ADDRESS, 0, IORegisterType.READ_WRITE,
            this.ioRegisterOperationSource, 'Timer Preload Register');
        ioRegMapService.addRegister('TMRCOUNTER', TMRCOUNTER_REGISTER_ADDRESS, 0, IORegisterType.READ_ONLY,
            this.ioRegisterOperationSource, 'Timer counter Register');

        this.cpuConsumeTicksSubscription = this.cpuService.cpuConsumeTicks$.subscribe(
            (ticks) => this.processCPUConsumeTicks(ticks)
        );

    }

    private processWriteOperation(address: number, value: number) {

        switch (address) {
            case TMRPRELOAD_REGISTER_ADDRESS:
                this.timerPreloadRegister = value;
                this.timerCounterRegister = value;

                this.state = TimerState.PRELOADED;

                this.ioRegMapService.store(TMRCOUNTER_REGISTER_ADDRESS, value, false, false);
                break;
            case TMRCOUNTER_REGISTER_ADDRESS:
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

    private processCPUConsumeTicks(ticks: number) {

        switch (this.state) {

            case TimerState.RESET:
                break;
            case TimerState.PRELOADED:
                this.state = TimerState.RUNNING;
                break;
            case TimerState.RUNNING:
                this.timerCounterRegister -= ticks;

                this.ioRegMapService.store(TMRCOUNTER_REGISTER_ADDRESS, this.timerCounterRegister, false, false);

                if (this.timerCounterRegister === 0) {
                    this.state = TimerState.DEPLETED;
                    this.irqCtrlService.triggerHardwareInterrupt(1);
                }
                break;
            case TimerState.DEPLETED:
                this.timerCounterRegister = this.timerPreloadRegister;
                this.ioRegMapService.store(TMRCOUNTER_REGISTER_ADDRESS, this.timerCounterRegister, false, false);
                this.state = TimerState.RUNNING;
            break;
        }

    }

    public reset() {

        this.state = TimerState.RESET;
        this.timerPreloadRegister = 0;
        this.timerCounterRegister = 0; 

        this.ioRegMapService.store(TMRPRELOAD_REGISTER_ADDRESS, 0, false, false);
        this.ioRegMapService.store(TMRCOUNTER_REGISTER_ADDRESS, 0, false, false);

    }

}
