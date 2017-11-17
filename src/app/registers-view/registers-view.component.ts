import { Component, OnDestroy, OnInit, Input } from '@angular/core';

import { Subscription } from 'rxjs/Subscription';
import { Utils } from '../utils';

import { CPUService } from '../cpu.service';
import { CPURegisterIndex, CPURegisterOperation, CPURegisterOperationType } from '../cpuregs';

class CPURegisterView {

    public name: string;
    public description: string;
    private _value: number;
    private _strValue: string;
    public bitField: Array<number> = new Array<number>(16);

    constructor(name: string, initialValue: number = 0,
                description?: string) {

        this.name = name;
        this.description = description;
        this._value = initialValue;
        this._strValue = Utils.pad(initialValue, 16, 4);

        for (let i = 0; i < 16; i++) {

            if ((initialValue & (1 << i)) === (1 << i)) {
                this.bitField[i] = 1;
            } else {
                this.bitField[i] = 0;
            }

        }
    }

    get value() {

        return this._value;

    }

    get strValue() {

        return this._strValue;

    }

    set value(newValue: number) {

        this._strValue = Utils.pad(newValue, 16, 4);
        this._value = newValue;

        for (let i = 0; i < 16; i++) {

            if ((newValue & (1 << i)) === (1 << i)) {
                this.bitField[i] = 1;
            } else {
                this.bitField[i] = 0;
            }

        }

    }

}

@Component({
    selector: 'app-registers-view',
    templateUrl: './registers-view.component.html'
})
export class RegistersViewComponent implements OnInit, OnDestroy {

    public A: CPURegisterView;
    public B: CPURegisterView;
    public C: CPURegisterView;
    public D: CPURegisterView;

    public SR: CPURegisterView;
    public IP: CPURegisterView;
    public SP: CPURegisterView;

    @Input() displayA: boolean;
    @Input() displayB: boolean;
    @Input() displayC: boolean;
    @Input() displayD: boolean;

    private registersMap: Map<number, CPURegisterView> = new Map<number, CPURegisterView>();

    private cpuRegisterOperationSubscription: Subscription;

    constructor(private cpuService: CPUService) {

        const registerBank = this.cpuService.getRegistersBank();

        let register = registerBank.get(CPURegisterIndex.A);
        this.A = new CPURegisterView(register.name, register.value, register.description);
        this.registersMap.set(CPURegisterIndex.A, this.A);

        register = registerBank.get(CPURegisterIndex.B);
        this.B = new CPURegisterView(register.name, register.value, register.description);
        this.registersMap.set(CPURegisterIndex.B, this.B);

        register = registerBank.get(CPURegisterIndex.C);
        this.C = new CPURegisterView(register.name, register.value, register.description);
        this.registersMap.set(CPURegisterIndex.C, this.C);

        register = registerBank.get(CPURegisterIndex.D);
        this.D = new CPURegisterView(register.name, register.value, register.description);
        this.registersMap.set(CPURegisterIndex.D, this.D);

        register = registerBank.get(CPURegisterIndex.IP);
        this.IP = new CPURegisterView(register.name, register.value, register.description);
        this.registersMap.set(CPURegisterIndex.IP, this.IP);

        register = registerBank.get(CPURegisterIndex.SP);
        this.SP = new CPURegisterView(register.name, register.value, register.description);
        this.registersMap.set(CPURegisterIndex.SP, this.SP);

        register = registerBank.get(CPURegisterIndex.SR);
        this.SR = new CPURegisterView(register.name, register.value, register.description);
        this.registersMap.set(CPURegisterIndex.SR, this.SR);

        this.cpuRegisterOperationSubscription = this.cpuService.cpuRegisterOperation$.subscribe(
            (cpuRegisterOperation) => this.processCPURegisterOperation(cpuRegisterOperation)
        );
    }

    ngOnInit() {
    }

    ngOnDestroy() {

        this.cpuRegisterOperationSubscription.unsubscribe();

    }

    private operationWriteRegister(index: number, value: number) {

        const registerView = this.registersMap.get(index);

        if (registerView) {

            registerView.value = value;

        }

    }

    private processCPURegisterOperation(cpuRegisterOperation: CPURegisterOperation) {

        switch (cpuRegisterOperation.operationType) {

            case CPURegisterOperationType.WRITE:
            case CPURegisterOperationType.PUSH_WORD:
            case CPURegisterOperationType.PUSH_BYTE:
            case CPURegisterOperationType.POP_WORD:
            case CPURegisterOperationType.POP_BYTE:
                this.operationWriteRegister(
                    cpuRegisterOperation.index,
                    cpuRegisterOperation.value);
                break;
            default:
                break;

        }

    }

}
