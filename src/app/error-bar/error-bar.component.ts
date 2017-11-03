import {Component, OnDestroy, OnInit } from '@angular/core';
import { ErrorBarService } from '../error-bar.service';

import { Subscription } from 'rxjs/Subscription';

@Component({
    selector: 'app-error-bar',
    templateUrl: './error-bar.component.html'
})
export class ErrorBarComponent implements OnInit, OnDestroy {

    public errorMessage: string;
    private errorBarEventSubscription: Subscription;

    constructor(private errorBarService: ErrorBarService) { }

    ngOnInit() {

        this.errorBarEventSubscription = this.errorBarService.errorBarPublish$.subscribe(
            (errorMessage) => this.errorMessage = errorMessage
        );

    }

    ngOnDestroy() {

        this.errorBarEventSubscription.unsubscribe();

    }

    closeErrorBar() {

        this.errorMessage = undefined;

    }

}
