import { Component, OnDestroy, OnInit, Output, EventEmitter } from '@angular/core';

import { Subscription } from 'rxjs';
import { Utils } from '../utils';

import { CPUService } from '../cpu.service';
import {
    CPURegisterIndex, CPURegisterOperation, CPURegisterOperationType,
    CPURegisterRegularOpParams, CPURegisterBitOpParams
} from '../cpuregs';


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
    public SSP: CPURegisterView;
    public USP: CPURegisterView;

    public displayA = false;
    public displayB = false;
    public displayC = false;
    public displayD = false;

    @Output() onRegisterClick = new EventEmitter<CPURegisterIndex>();

    private registersMap: Map<number, CPURegisterView> = new Map<number, CPURegisterView>();

    private cpuRegisterOperationSubscription: Subscription;

    constructor(private cpuService: CPUService) {

        const registerBank = this.cpuService.getRegistersBank();

        let register = registerBank.get(CPURegisterIndex.A);
        this.A = new CPURegisterView(register.name, register.value, register.description);
        this.registersMap.set(CPURegisterIndex.A, this.A);
        this.registersMap.set(CPURegisterIndex.AH, this.A);
        this.registersMap.set(CPURegisterIndex.AL, this.A);

        register = registerBank.get(CPURegisterIndex.B);
        this.B = new CPURegisterView(register.name, register.value, register.description);
        this.registersMap.set(CPURegisterIndex.B, this.B);
        this.registersMap.set(CPURegisterIndex.BH, this.B);
        this.registersMap.set(CPURegisterIndex.BL, this.B);

        register = registerBank.get(CPURegisterIndex.C);
        this.C = new CPURegisterView(register.name, register.value, register.description);
        this.registersMap.set(CPURegisterIndex.C, this.C);
        this.registersMap.set(CPURegisterIndex.CH, this.C);
        this.registersMap.set(CPURegisterIndex.CL, this.C);

        register = registerBank.get(CPURegisterIndex.D);
        this.D = new CPURegisterView(register.name, register.value, register.description);
        this.registersMap.set(CPURegisterIndex.D, this.D);
        this.registersMap.set(CPURegisterIndex.DH, this.D);
        this.registersMap.set(CPURegisterIndex.DL, this.D);

        register = registerBank.get(CPURegisterIndex.IP);
        this.IP = new CPURegisterView(register.name, register.value, register.description);
        this.registersMap.set(CPURegisterIndex.IP, this.IP);

        register = registerBank.get(CPURegisterIndex.SSP);
        this.SSP = new CPURegisterView(register.name, register.value, register.description);
        this.registersMap.set(CPURegisterIndex.SSP, this.SSP);

        register = registerBank.get(CPURegisterIndex.USP);
        this.USP = new CPURegisterView(register.name, register.value, register.description);
        this.registersMap.set(CPURegisterIndex.USP, this.USP);

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

    public isSupervisorMode(): boolean {

        return ((this.SR.value & 0x8000) !== 0);

    }

    private operationWriteRegister(index: number, value: number) {

        const registerView = this.registersMap.get(index);

        switch (index) {
            case CPURegisterIndex.AH:
            case CPURegisterIndex.BH:
            case CPURegisterIndex.CH:
            case CPURegisterIndex.DH:
                registerView.value = (registerView.value & 0x00FF) + (value << 8);
                break;
            case CPURegisterIndex.AL:
            case CPURegisterIndex.BL:
            case CPURegisterIndex.CL:
            case CPURegisterIndex.DL:
                registerView.value = (registerView.value & 0xFF00) + value;
                break;
            default:
                registerView.value = value;
                break;
        }

    }

    private operationWriteBit(index: number, bitNumber: number, value: number) {

        const registerView = this.registersMap.get(index);

        if (value === 0) {
            registerView.value &= ~(1 << bitNumber);
        } else {
            registerView.value |= (1 << bitNumber);
        }

    }

    private processCPURegisterOperation(cpuRegisterOperation: CPURegisterOperation) {

        switch (cpuRegisterOperation.operationType) {

            case CPURegisterOperationType.WRITE:
                this.operationWriteRegister(
                    (<CPURegisterRegularOpParams>cpuRegisterOperation.data).index,
                    (<CPURegisterRegularOpParams>cpuRegisterOperation.data).value);
                break;
            case CPURegisterOperationType.WRITE_BIT:
                this.operationWriteBit(
                    (<CPURegisterBitOpParams>cpuRegisterOperation.data).index,
                    (<CPURegisterBitOpParams>cpuRegisterOperation.data).bitNumber,
                    (<CPURegisterBitOpParams>cpuRegisterOperation.data).value);
                break;
            default:
                break;

        }

    }

    public toggleDisplayRegister(registerIndex: CPURegisterIndex) {

        switch (registerIndex) {
            case CPURegisterIndex.A:
                this.displayA = !this.displayA;
                this.onRegisterClick.next(CPURegisterIndex.A);
                break;
            case CPURegisterIndex.B:
                this.displayB = !this.displayB;
                this.onRegisterClick.next(CPURegisterIndex.B);
                break;
            case CPURegisterIndex.C:
                this.displayC = !this.displayC;
                this.onRegisterClick.next(CPURegisterIndex.C);
                break;
            case CPURegisterIndex.D:
                this.displayD = !this.displayD;
                this.onRegisterClick.next(CPURegisterIndex.D);
                break;
        }

    }

}
