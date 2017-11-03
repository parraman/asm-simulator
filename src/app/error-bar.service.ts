import { Injectable } from '@angular/core';

import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';

@Injectable()
export class ErrorBarService {

    private errorBarPublishSource = new Subject<string>();

    public errorBarPublish$: Observable<string>;

    constructor() {

        this.errorBarPublish$ = this.errorBarPublishSource.asObservable();

    }

    public setErrorMessage(errorMessage: string) {

        this.errorBarPublishSource.next(errorMessage);

    }

}
