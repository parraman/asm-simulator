import { Component, OnInit, Input, OnDestroy, SimpleChanges, OnChanges,
    EventEmitter, Output } from '@angular/core';
import { MemoryOperation, MemoryService, MemoryOperationType } from '../memory.service';
import { Subscription } from 'rxjs/Subscription';
import { ErrorBarService } from '../error-bar.service';
import { Utils } from '../utils';
import { CPUService } from '../cpu.service';
import { CPURegisterIndex, CPURegisterOperation, CPURegisterOperationType } from '../cpuregs';


class MemoryCellView {

    private _value: number;
    private _strValue: string;

    public style: string;
    public memoryRegionStyle: string;
    public address: number;
    public isInstruction: boolean;

    constructor(address: number, initialValue: number = 0, initialStyle?: string, isInstruction: boolean = false) {

        this.style = initialStyle;
        this._value = initialValue;
        this._strValue = Utils.pad(initialValue, 16, 2);
        this.address = address;
        this.isInstruction = isInstruction;

    }

    get value() {

        return this._value;

    }

    get strValue() {

        return this._strValue;

    }

    set value(newValue: number) {

        this._value = newValue;
        this._strValue = Utils.pad(newValue, 16, 2);

    }

}


@Component({
    selector: 'app-memory-view',
    templateUrl: './memory-view.component.html'
})
export class MemoryViewComponent implements OnInit, OnDestroy, OnChanges {

    @Input() mapping: Map<number, number>;
    @Input() displayA: boolean;
    @Input() displayB: boolean;
    @Input() displayC: boolean;
    @Input() displayD: boolean;
    @Input() showInstructions: boolean;

    @Output() onMemoryCellClick = new EventEmitter<number>();

    public splitMemoryArea = false;

    public memoryCellViews: Array<MemoryCellView>;

    private memoryRegionViews: Map<string, {'startAddress': number, 'endAddress': number}> =
        new Map<string, {'startAddress': number, 'endAddress': number}>();

    private memoryOperationSubscription: Subscription;
    private cpuRegisterOperationSubscription: Subscription;

    public memoryColsIndexes: string[] = [];
    public memoryRowsIndexes: string[] = [];

    public size: number;

    public editingCell = [-1, -1];
    public newCellValue: string;

    private stackedCells: Array<number> = [];

    private registerAPointer: number;
    private registerBPointer: number;
    private registerCPointer: number;
    private registerDPointer: number;
    private registerIPPointer: number;
    private registerSPPointer: number;

    constructor(private memoryService: MemoryService,
                private cpuService: CPUService,
                private errorBarService: ErrorBarService) {

        this.size = memoryService.getSize();

        this.createIndexes();

        this.memoryCellViews = new Array<MemoryCellView>(this.size);

        for (let i = 0; i < this.size; i++) {

            this.memoryCellViews[i] = new MemoryCellView(i, 0);

        }

        const registerBank = this.cpuService.getRegistersBank();

        this.registerAPointer = registerBank.get(CPURegisterIndex.A).value;
        this.registerBPointer = registerBank.get(CPURegisterIndex.B).value;
        this.registerCPointer = registerBank.get(CPURegisterIndex.C).value;
        this.registerDPointer = registerBank.get(CPURegisterIndex.D).value;
        this.registerSPPointer = registerBank.get(CPURegisterIndex.SP).value;
        this.registerIPPointer = registerBank.get(CPURegisterIndex.IP).value;

        this.updateCellStyle(this.registerIPPointer);
        this.updateCellStyle(this.registerSPPointer);

        this.memoryOperationSubscription = this.memoryService.memoryOperation$.subscribe(
            (memoryOperation) => this.processMemoryOperation(memoryOperation)
        );

        this.cpuRegisterOperationSubscription = this.cpuService.cpuRegisterOperation$.subscribe(
            (cpuRegisterOperation) => this.processCPURegisterOperation(cpuRegisterOperation)
        );

    }

    private createIndexes() {

        for (const i of Array.from({length: 16}, (value, key) => key)) {

            this.memoryColsIndexes.push(Utils.pad(i, 16, 1));

        }

        for (const i of Array.from({length: this.memoryService.getSize() / 16}, (value, key) => key)) {

            this.memoryRowsIndexes.push(Utils.pad(i, 16, 3));

        }

    }

    ngOnInit() {
    }

    ngOnDestroy() {

        this.memoryOperationSubscription.unsubscribe();

    }

    private operationAddRegion(regionID: string, name: string, startAddress: number, endAddress: number,
                               initialValue: number = 0) {

        for (let i = startAddress; i <= endAddress; i++) {

            this.memoryCellViews[i].value = initialValue;
            this.memoryCellViews[i].memoryRegionStyle =
                name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
            this.updateCellStyle(i);
        }

        this.memoryRegionViews.set(regionID, {'startAddress': startAddress, 'endAddress': endAddress});

    }

    private operationRemoveRegion(regionID: string) {

        const memoryRegion = this.memoryRegionViews.get(regionID);

        if (memoryRegion) {

            const startAddress = memoryRegion['startAddress'];
            const endAddress = memoryRegion['endAddress'];

            for (let i = startAddress; i <= endAddress; i++) {

                this.memoryCellViews[i].value = 0;
                this.memoryCellViews[i].memoryRegionStyle = undefined;
                this.updateCellStyle(i);

            }

            this.memoryRegionViews.delete(regionID);

        }

    }

    private operationWriteByte(address: number, value: number) {

        this.memoryCellViews[address].value = value;

    }

    private operationWriteWord(address: number, value: number) {

        this.memoryCellViews[address].value = (value & 0xFF00) >>> 8;
        this.memoryCellViews[address + 1].value = (value & 0x00FF);

    }


    private operationWriteCells(initialAddress: number, values: Array<number>) {

        for (let i = initialAddress; i < initialAddress + values.length; i++) {

            this.memoryCellViews[i].value = values[i];

        }

    }

    private operationReset() {

        for (let i = 0; i < this.size; i++) {

            this.memoryCellViews[i].value = 0;

        }

    }

    private operationPushWord(value: number) {

        const previousRegisterSPPointer = this.registerSPPointer;
        this.registerSPPointer = value;

        this.stackedCells.push(previousRegisterSPPointer);
        this.stackedCells.push(previousRegisterSPPointer - 1);

        this.updateCellStyle(previousRegisterSPPointer);
        this.updateCellStyle(previousRegisterSPPointer - 1);
        this.updateCellStyle(this.registerSPPointer);

    }

    private operationPushByte(value: number) {

        const previousRegisterSPPointer = this.registerSPPointer;
        this.registerSPPointer = value;

        this.stackedCells.push(previousRegisterSPPointer);

        this.updateCellStyle(previousRegisterSPPointer);
        this.updateCellStyle(this.registerSPPointer);

    }

    private operationPopByte(value: number) {

        const previousRegisterSPPointer = this.registerSPPointer;
        this.registerSPPointer = value;

        this.stackedCells.splice(this.stackedCells.indexOf(previousRegisterSPPointer + 1), 1);

        this.updateCellStyle(previousRegisterSPPointer);
        this.updateCellStyle(this.registerSPPointer);

    }

    private operationPopWord(value: number) {

        const previousRegisterSPPointer = this.registerSPPointer;
        this.registerSPPointer = value;

        this.stackedCells.splice(this.stackedCells.indexOf(previousRegisterSPPointer + 1), 1);
        this.stackedCells.splice(this.stackedCells.indexOf(previousRegisterSPPointer + 2), 1);

        this.updateCellStyle(previousRegisterSPPointer);
        this.updateCellStyle(previousRegisterSPPointer + 1);
        this.updateCellStyle(this.registerSPPointer);

    }

    private operationWriteRegister(index: CPURegisterIndex, value: number) {

        switch (index) {

            case CPURegisterIndex.A:

                const previousRegisterAPointer = this.registerAPointer;
                this.registerAPointer = value;

                if (this.displayA === true) {

                    if (previousRegisterAPointer >= 0 && previousRegisterAPointer < this.size) {
                        this.updateCellStyle(previousRegisterAPointer);
                    }
                    this.updateCellStyle(this.registerAPointer);
                }
                break;
            case CPURegisterIndex.B:

                const previousRegisterBPointer = this.registerBPointer;
                this.registerBPointer = value;

                if (this.displayB === true) {

                    if (previousRegisterBPointer >= 0 && previousRegisterBPointer < this.size) {
                        this.updateCellStyle(previousRegisterBPointer);
                    }
                    this.updateCellStyle(this.registerBPointer);
                }
                break;
            case CPURegisterIndex.C:

                const previousregisterCPointer = this.registerCPointer;
                this.registerCPointer = value;

                if (this.displayC === true) {

                    if (previousregisterCPointer >= 0 && previousregisterCPointer < this.size) {
                        this.updateCellStyle(previousregisterCPointer);
                    }
                    this.updateCellStyle(this.registerCPointer);

                }
                break;
            case CPURegisterIndex.D:

                const previousregisterDPointer = this.registerDPointer;
                this.registerDPointer = value;

                if (this.displayD === true) {

                    if (previousregisterDPointer >= 0 && previousregisterDPointer < this.size) {
                        this.updateCellStyle(previousregisterDPointer);
                    }
                    this.updateCellStyle(this.registerDPointer);

                }
                break;
            case CPURegisterIndex.IP:

                const previousregisterIPPointer = this.registerIPPointer;
                this.registerIPPointer = value;

                this.updateCellStyle(previousregisterIPPointer);
                this.updateCellStyle(this.registerIPPointer);

                break;

            case CPURegisterIndex.SP:

                const previousRegisterSPPointer = this.registerSPPointer;
                this.registerSPPointer = value;

                this.updateCellStyle(previousRegisterSPPointer);
                this.updateCellStyle(this.registerSPPointer);

                // And we have to flush the stack
                const previousStackedCells = this.stackedCells;
                this.stackedCells = [];
                previousStackedCells.forEach((cell) => this.updateCellStyle(cell));

                break;

        }

    }

    private processCPURegisterOperation(cpuRegisterOperation: CPURegisterOperation) {

        switch (cpuRegisterOperation.operationType) {

            case CPURegisterOperationType.WRITE:
                this.operationWriteRegister(cpuRegisterOperation.index, cpuRegisterOperation.value);
                break;
            case CPURegisterOperationType.PUSH_WORD:
                this.operationPushWord(cpuRegisterOperation.value);
                break;
            case CPURegisterOperationType.PUSH_BYTE:
                this.operationPushByte(cpuRegisterOperation.value);
                break;
            case CPURegisterOperationType.POP_WORD:
                this.operationPopWord(cpuRegisterOperation.value);
                break;
            case CPURegisterOperationType.POP_BYTE:
                this.operationPopByte(cpuRegisterOperation.value);
                break;
        }


    }

    private processMemoryOperation(memoryOperation: MemoryOperation) {

        switch (memoryOperation.operationType) {

            case MemoryOperationType.ADD_REGION:
                this.operationAddRegion(
                    memoryOperation.data.get('regionID'),
                    memoryOperation.data.get('name'),
                    memoryOperation.data.get('startAddress'),
                    memoryOperation.data.get('endAddress'),
                    memoryOperation.data.get('initialValue'));
                break;
            case MemoryOperationType.REMOVE_REGION:
                this.operationRemoveRegion(memoryOperation.data.get('regionID'));
                break;
            case MemoryOperationType.STORE_BYTE:
                this.operationWriteByte(
                    memoryOperation.data.get('address'),
                    memoryOperation.data.get('value'));
                break;
            case MemoryOperationType.STORE_BYTES:
                this.operationWriteCells(
                    memoryOperation.data.get('initialAddress'),
                    memoryOperation.data.get('values'));
                break;
            case MemoryOperationType.STORE_WORD:
                this.operationWriteWord(
                    memoryOperation.data.get('address'),
                    memoryOperation.data.get('value'));
                break;
            case MemoryOperationType.LOAD_BYTE:
                break;
            case MemoryOperationType.RESET:
                this.operationReset();
                break;
            case MemoryOperationType.SIZE_CHANGE: // TODO: Complete the code to update the size of the memory
                break;
            default:
                break;
        }

    }

    public setCellValue(view: number, address: number) {


        try {
            this.memoryService.storeByte(address, parseInt(this.newCellValue, 16), false);

            if (this.memoryCellViews[address].isInstruction === true) {
                this.memoryCellViews[address].isInstruction = false;
                this.updateCellStyle(address);
            }

        } catch (e) {
            this.errorBarService.setErrorMessage(e.toString());
        }

        this.editingCell[view] = -1;

    }

    private updateCellStyle(address: number) {

        /* Order of styling:
         * - instruction pointer >
         * - stack pointer >
         * - register A pointer >
         * - register B pointer >
         * - register C pointer >
         * - register D pointer >
         * - stack
         * - mapped instruction >
         * - region
         */

        if (address < 0 || address >= this.size) {
            return;
        }

        this.memoryCellViews[address].style = undefined;

        if (this.memoryCellViews[address].memoryRegionStyle !== undefined) {
            this.memoryCellViews[address].style = this.memoryCellViews[address].memoryRegionStyle;
        }

        if (this.showInstructions &&
            this.memoryCellViews[address].isInstruction === true) {
            this.memoryCellViews[address].style = 'instr-bg';
        }

        if (this.stackedCells.indexOf(address) !== -1) {
            this.memoryCellViews[address].style = 'stack-bg';
        }

        if (this.displayD === true &&
            this.registerDPointer === address) {
            this.memoryCellViews[address].style = 'marker marker-d';
        }

        if (this.displayC === true &&
            this.registerCPointer === address) {
            this.memoryCellViews[address].style = 'marker marker-c';
        }

        if (this.displayB === true &&
            this.registerBPointer === address) {
            this.memoryCellViews[address].style = 'marker marker-b';
        }

        if (this.displayA === true &&
            this.registerAPointer === address) {
            this.memoryCellViews[address].style = 'marker marker-a';
        }

        if (this.registerSPPointer === address) {
            this.memoryCellViews[address].style = 'marker marker-sp';
        }

        if (this.registerIPPointer === address) {
            this.memoryCellViews[address].style = 'marker marker-ip';
        }

    }

    ngOnChanges(changes: SimpleChanges) {

        if ('mapping' in changes) {

            /* We need to undo the previous assignment */

            const previousMapping: Map<number, number> = changes['mapping'].previousValue;

            if (previousMapping) {
                for (const i of Array.from(previousMapping.keys())) {

                    this.memoryCellViews[i].isInstruction = false;
                    this.updateCellStyle(i);

                }
            }

            const currentMapping: Map<number, number> = changes['mapping'].currentValue;

            if (currentMapping) {
                for (const i of Array.from(currentMapping.keys())) {

                    this.memoryCellViews[i].isInstruction = true;
                    this.updateCellStyle(i);

                }
            }

        }
        if ('displayA' in changes) {

            this.updateCellStyle(this.registerAPointer);

        }
        if ('displayB' in changes) {

            this.updateCellStyle(this.registerBPointer);

        }
        if ('displayC' in changes) {

            this.updateCellStyle(this.registerCPointer);

        }
        if ('displayD' in changes) {

            this.updateCellStyle(this.registerDPointer);

        }


    }

    public memoryCellClick(event: MouseEvent, view: number, address: number) {

        if (event.ctrlKey || event.metaKey) {

            this.editingCell[view] = address;
            this.newCellValue = this.memoryCellViews[address].strValue;

        } else {

            this.onMemoryCellClick.emit(address);

        }

    }

}
