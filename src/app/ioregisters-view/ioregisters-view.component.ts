import { Component, OnInit } from '@angular/core';

import { IORegisterOperation, IORegMapService, IORegisterOperationType } from '../ioregmap.service';


class IORegisterView {

    public name: string;
    public description: string;
    public address: number;
    public value: number;

    constructor(name: string, address: number, 
		initialValue: number = 0,
		description?: string) {

        this.name = name;
        this.description = description;
        this.address = address;
        this.value = initialValue;

    }

}

@Component({
  selector: 'app-ioregisters-view',
  templateUrl: './ioregisters-view.component.html',
  styleUrls: ['./ioregisters-view.component.css']
})
export class IORegistersViewComponent implements OnInit, OnDestroy {

    private registersViewMap: Map<number, IORegisterView> = new Map<number, IORegister>();

    private ioRegisterOperationSubscription: Subscription;


    constructor(private ioRegMapService: IORegMapService) { }

    ngOnInit() {

        this.ioRegisterOperationSubscription = this.ioRegMapService.ioRegisterOperation$.subscribe(
            (ioRegisterOperation) => this.processIORegisterOperation(ioRegisterOperation)
        );

    }

    ngOnDestroy() {

        this.ioRegisterOperationSubscription.unsubscribe();

    }

    private processIORegisterOperation(ioRegisterOperation: IORegisterOperation) {

        switch (ioRegisterOperation.operationType) {
            


        }


    }

}
