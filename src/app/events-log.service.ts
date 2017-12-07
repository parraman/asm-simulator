import { Injectable } from '@angular/core';

import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';

import { ClockService } from './clock.service';

export interface SystemEvent {

    toString(): string;

}

export interface LoggedEvent {

    time: number;
    systemEvent: SystemEvent;

}

@Injectable()
export class EventsLogService {

    protected eventsLogSource = new Subject<LoggedEvent>();
    public eventsLog$: Observable<LoggedEvent>;

    constructor(private clockService: ClockService) {

        this.eventsLog$ = this.eventsLogSource.asObservable();

    }

    public log(systemEvent: SystemEvent) {

        const loggedEvent: LoggedEvent = {

            time: this.clockService.getClock(),
            systemEvent: systemEvent

        };

        this.eventsLogSource.next(loggedEvent);

    }

}
