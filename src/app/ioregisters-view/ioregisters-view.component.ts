import { Component, OnInit, OnDestroy } from '@angular/core';

import { IORegisterOperation, IORegMapService, IORegisterOperationType,
         IORegisterOperationAddRegister,
         IORegisterOperationParamsReadWrite } from '../ioregmap.service';
import { Utils } from '../utils';

import { Subscription } from 'rxjs';


class IORegisterView {

    public name: string;
    public description: string;
    private _address: number;
    private _strAddress: string;

    private _value: number;
    private _strValue: string;

    constructor(name: string, address: number,
                initialValue: number = 0,
                description?: string) {

        this.name = name;
        this.description = description;
        this._address = address;
        this._strAddress = Utils.pad(address, 16, 4);
        this._value = initialValue;
        this._strValue = Utils.pad(initialValue, 16, 4);

    }

    get value() {

        return this._value;

    }

    get strValue() {

        return this._strValue;

    }

    set value(newValue: number) {

        this._strValue = Utils.pad(newValue, 16, 4);

    }

    get address(): number {

        return this._address;

    }

    get strAddress(): string {

        return this._strAddress;

    }

    set address(newAddress: number) {

        this._strAddress = Utils.pad(newAddress, 16, 4);

    }

}

@Component({
    selector: 'app-ioregisters-view',
    templateUrl: './ioregisters-view.component.html'
})
export class IORegistersViewComponent implements OnInit, OnDestroy {

    public registersViewMap: Map<number, IORegisterView> = new Map<number, IORegisterView>();
    public registerAddresses: Array<number> = [];

    private ioRegisterOperationSubscription: Subscription;


    constructor(private ioRegMapService: IORegMapService) {

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

    ngOnInit() {

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

    private operationWriteRegister(address: number, value: number) {

        const registerView = this.registersViewMap.get(address);

        if (registerView) {

            registerView.value = value;

        }

    }

    private processIORegisterOperation(ioRegisterOperation: IORegisterOperation) {

        switch (ioRegisterOperation.operationType) {

            case IORegisterOperationType.ADD_REGISTER:
                this.operationAddRegister(
                    (<IORegisterOperationAddRegister>ioRegisterOperation.data).name,
                    (<IORegisterOperationAddRegister>ioRegisterOperation.data).address,
                    (<IORegisterOperationAddRegister>ioRegisterOperation.data).initialValue,
                    (<IORegisterOperationAddRegister>ioRegisterOperation.data).description);
                break;
            case IORegisterOperationType.WRITE:
                this.operationWriteRegister(
                    (<IORegisterOperationParamsReadWrite>ioRegisterOperation.data).address,
                    (<IORegisterOperationParamsReadWrite>ioRegisterOperation.data).value);
                break;

        }

    }

}
