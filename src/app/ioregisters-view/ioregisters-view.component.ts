import { Component, OnInit, OnDestroy } from '@angular/core';

import { IORegisterOperation, IORegMapService, IORegisterOperationType } from '../ioregmap.service';
import { Utils } from '../utils';

import { Subscription } from 'rxjs/Subscription';


class IORegisterView {

    public name: string;
    public description: string;
    public address: string;
    public value: string;

    constructor(name: string, address: number,
                initialValue: number = 0,
                description?: string) {

        this.name = name;
        this.description = description;
        this.address = Utils.pad(address, 16, 4);
        this.value = Utils.pad(initialValue, 16, 4);

    }

}

@Component({
    selector: 'app-ioregisters-view',
    templateUrl: './ioregisters-view.component.html'
})
export class IORegistersViewComponent implements OnInit, OnDestroy {

    private registersViewMap: Map<number, IORegisterView> = new Map<number, IORegisterView>();
    private registerAddresses: Array<number> = [];

    private ioRegisterOperationSubscription: Subscription;


    constructor(private ioRegMapService: IORegMapService) { }

    ngOnInit() {

        const registersMap = this.ioRegMapService.getRegistersMap();

        registersMap.forEach((register, address) => {

            this.operationAddRegister(
                register.name,
                register.address,
                register.value,
                register.description);

        });

        this.ioRegisterOperationSubscription = this.ioRegMapService.ioRegisterOperation$.subscribe(
            (ioRegisterOperation) => this.processIORegisterOperation(ioRegisterOperation)
        );

    }

    ngOnDestroy() {

        this.ioRegisterOperationSubscription.unsubscribe();

    }

    private operationAddRegister(name: string, address: number,
                                 initialValue: number = 0,
                                 description?: string) {


        const registerView = new IORegisterView(name, address, initialValue, description);

        this.registersViewMap.set(address, registerView);
        this.registerAddresses.push(address);

    }

    private operationRemoveRegister(address: number) {

        if (this.registersViewMap.has(address)) {

            this.registersViewMap.delete(address);
            this.registerAddresses.splice(this.registerAddresses.indexOf(address), 1);

        }

    }

    private operationWriteRegister(address: number, value: number) {

        const registerView = this.registersViewMap.get(address);

        if (registerView) {

            registerView.value = Utils.pad(value, 16, 4);

        }

    }

    private processIORegisterOperation(ioRegisterOperation: IORegisterOperation) {

        switch (ioRegisterOperation.operationType) {

            case IORegisterOperationType.ADD_REGISTER:
                this.operationAddRegister(
                    ioRegisterOperation.data.get('name'),
                    ioRegisterOperation.data.get('address'),
                    ioRegisterOperation.data.get('initialValue'),
                    ioRegisterOperation.data.get('description'));
                break;
            case IORegisterOperationType.REMOVE_REGISTER:
                this.operationRemoveRegister(
                    ioRegisterOperation.data.get('address'));
                break;
            case IORegisterOperationType.WRITE:
                this.operationWriteRegister(
                    ioRegisterOperation.data.get('address'),
                    ioRegisterOperation.data.get('value'));
                break;
            case IORegisterOperationType.RESET:
                break;

        }

    }

}
