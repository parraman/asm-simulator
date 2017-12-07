import { Injectable } from '@angular/core';

import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';

@Injectable()
export class ClockService {

    protected clockConsumeTicksSource = new Subject<number>();
    public clockConsumeTicks$: Observable<number>;

    private ticks = 0;

    constructor() {

        this.clockConsumeTicks$ = this.clockConsumeTicksSource.asObservable();

    }

    public consumeTicks(ticks: number) {

        this.ticks += ticks;

        this.clockConsumeTicksSource.next(ticks);

    }
    public getClock(): number {

        return this.ticks;

    }

}
