import { Injectable } from '@angular/core';

import { Subject, Observable } from 'rxjs';

import { ClockService } from './clock.service';

export interface SystemEvent {

    toString(): string;

}

export interface LoggedEvent {

    time: number;
    systemEvent: SystemEvent;
    flushGroups: boolean;

}

export class SystemEventGroupMark implements SystemEvent {

    startGroup: boolean;
    systemEvent: SystemEvent;

    constructor(startGroup: boolean, systemEvent: SystemEvent) {

        this.startGroup = startGroup;
        this.systemEvent = systemEvent;

    }

    toString(): string {

        return `-- event group mark --`;

    }

}

@Injectable()
export class EventsLogService {

    protected eventsLogSource = new Subject<LoggedEvent>();
    public eventsLog$: Observable<LoggedEvent>;

    constructor(private clockService: ClockService) {

        this.eventsLog$ = this.eventsLogSource.asObservable();

    }

    public log(systemEvent: SystemEvent, flushGroups: boolean = false) {

        const loggedEvent: LoggedEvent = {

            time: this.clockService.getClock(),
            systemEvent: systemEvent,
            flushGroups: flushGroups

        };

        this.eventsLogSource.next(loggedEvent);

    }

    public startEventGroup(systemEvent: SystemEvent) {

        const eventGroupMark = new SystemEventGroupMark(true, systemEvent);

        this.log(eventGroupMark);

    }

    public endEventGroup(systemEvent: SystemEvent) {

        const eventGroupMark = new SystemEventGroupMark(false, systemEvent);

        this.log(eventGroupMark);

    }

}
