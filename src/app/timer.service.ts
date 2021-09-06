import { Injectable } from '@angular/core';
import { IrqCtrlService } from './irqctrl.service';
import {
    IORegMapService, IORegisterOperation, IORegisterType,
    IORegisterOperationType, IORegisterOperationParamsReadWrite
} from './ioregmap.service';

import { Subject, Observable, Subscription } from 'rxjs';
import { ClockService} from './clock.service';

import { Utils } from './utils';
import { EventsLogService, SystemEvent } from './events-log.service';


const TMRPRELOAD_REGISTER_ADDRESS = 3;
const TMRCOUNTER_REGISTER_ADDRESS = 4;

enum TimerState {

    RESET = 0,
    PRELOAD = 1,
    RUNNING = 2,
    DEPLETED = 3

}

export enum TimerOperationType {

    RESET = 0,
    TIMER_PRELOAD = 1,
    TIMER_COUNTDOWN = 2,
    TIMER_DEPLETED = 3

}

export interface TimerOperationParams {

    value: number;

}

enum TimerOperationState {

    IN_PROGRESS = 0,
    FINISHED = 1

}

export class TimerOperation implements SystemEvent {

    public operationType: TimerOperationType;
    public data: TimerOperationParams;
    public state: TimerOperationState;

    constructor(operationType: TimerOperationType, data?: TimerOperationParams,
                state?: TimerOperationState) {

        this.operationType = operationType;
        this.data = data;
        this.state = state;

    }

    toString(): string {

        let ret;

        switch (this.operationType) {
            case TimerOperationType.RESET:
                ret = `TMR: Reset timer unit`;
                break;
            case TimerOperationType.TIMER_PRELOAD:
                ret = `TMR: Timer preload with value 0x${Utils.pad(this.data.value, 16, 4)}`;
                break;
            case TimerOperationType.TIMER_COUNTDOWN:
                ret = `TMR: Timer countdown -> 0x${Utils.pad(this.data.value, 16, 4)}`;
                break;
            case TimerOperationType.TIMER_DEPLETED:
                ret = `TMR: Timer depleted`;
                break;
            default:
                break;
        }

        return ret;

    }

}

@Injectable()
export class TimerService {

    private state: TimerState = TimerState.RESET;

    private timerPreloadRegister = 0; // TMRPRELD register (address: 0x0005)
    private timerCounterRegister = 0; // TMRCTR register (address: 0x0006)

    private timerOperationSource = new Subject<TimerOperation>();
    private timerOperation$: Observable<TimerOperation>;

    private clockConsumeTicksSubscription: Subscription;

    constructor(private ioRegMapService: IORegMapService,
                private irqCtrlService: IrqCtrlService,
                private clockService: ClockService,
                private eventsLogService: EventsLogService) {

        ioRegMapService.addRegister('TMRPRELOAD', TMRPRELOAD_REGISTER_ADDRESS, 0, IORegisterType.READ_WRITE,
            (op) => this.processRegisterOperation(op), 'Timer Preload Register');
        ioRegMapService.addRegister('TMRCOUNTER', TMRCOUNTER_REGISTER_ADDRESS, 0, IORegisterType.READ_ONLY,
            (op) => this.processRegisterOperation(op), 'Timer counter Register');

        this.timerOperation$ = this.timerOperationSource.asObservable();

        this.clockConsumeTicksSubscription = this.clockService.clockConsumeTicks$.subscribe(
            (ticks) => this.processClockConsumeTicks(ticks)
        );

    }

    protected publishTimerOperation(operation: TimerOperation, flushGroups: boolean = false) {

        this.eventsLogService.log(operation, flushGroups);
        this.timerOperationSource.next(operation);

    }

    protected publishTimerOperationStart(operation: TimerOperation) {

        operation.state = TimerOperationState.IN_PROGRESS;
        this.eventsLogService.startEventGroup(operation);
        this.timerOperationSource.next(operation);

    }

    protected publishTimerOperationEnd(operation: TimerOperation) {

        operation.state = TimerOperationState.FINISHED;
        this.eventsLogService.endEventGroup(operation);
        this.timerOperationSource.next(operation);

    }

    private processWriteOperation(address: number, value: number) {

        switch (address) {
            case TMRPRELOAD_REGISTER_ADDRESS:

                // Writing a ZERO into the TIMER_PRELOAD will reset the timer
                if (value === 0) {
                    this.reset();
                    break;
                }

                this.timerPreloadRegister = value;
                this.timerCounterRegister = value;

                this.state = TimerState.PRELOAD;

                const operation = new TimerOperation(TimerOperationType.TIMER_PRELOAD, { value: value });

                this.publishTimerOperationStart(operation);

                this.ioRegMapService.store(TMRCOUNTER_REGISTER_ADDRESS, value, false, false);

                this.publishTimerOperationEnd(operation);

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
                    (<IORegisterOperationParamsReadWrite>ioRegisterOperation.data).address,
                    (<IORegisterOperationParamsReadWrite>ioRegisterOperation.data).value);
                break;
        }

    }

    private processClockConsumeTicks(ticks: number) {

        let operation;

        switch (this.state) {

            case TimerState.RESET:
                break;
            case TimerState.PRELOAD:
                this.state = TimerState.RUNNING;
                break;
            case TimerState.RUNNING:
                this.timerCounterRegister -= ticks;

                operation = new TimerOperation(TimerOperationType.TIMER_COUNTDOWN, { value: this.timerCounterRegister });

                this.publishTimerOperationStart(operation);

                this.ioRegMapService.store(TMRCOUNTER_REGISTER_ADDRESS, this.timerCounterRegister, false, false);

                this.publishTimerOperationEnd(operation);

                if (this.timerCounterRegister === 0) {

                    this.state = TimerState.DEPLETED;

                    this.publishTimerOperation(new TimerOperation(TimerOperationType.TIMER_DEPLETED));

                    this.irqCtrlService.triggerHardwareInterrupt(1);

                }
                break;
            case TimerState.DEPLETED:
                this.timerCounterRegister = this.timerPreloadRegister;

                operation = new TimerOperation(TimerOperationType.TIMER_PRELOAD, { value: this.timerPreloadRegister });

                this.publishTimerOperationStart(operation);

                this.ioRegMapService.store(TMRCOUNTER_REGISTER_ADDRESS, this.timerCounterRegister, false, false);

                this.publishTimerOperationEnd(operation);

                this.state = TimerState.RUNNING;
            break;
        }

    }

    public reset() {

        const operation = new TimerOperation(TimerOperationType.RESET);

        this.publishTimerOperationStart(operation);

        this.state = TimerState.RESET;
        this.timerPreloadRegister = 0;
        this.timerCounterRegister = 0;

        this.ioRegMapService.store(TMRPRELOAD_REGISTER_ADDRESS, 0, false, false);
        this.ioRegMapService.store(TMRCOUNTER_REGISTER_ADDRESS, 0, false, false);

        this.publishTimerOperationEnd(operation);

    }

}
