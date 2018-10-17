import { Component } from '@angular/core';

import { Subject, Observable } from 'rxjs';

import {
    MemoryOperation, MemoryService, MemoryOperationParamsLoadStore,
    MemoryOperationType
} from '../memory.service';

import { Utils } from '../utils';
import { EventsLogService, SystemEvent } from '../events-log.service';

function getStrValue(value: number) {

    const character = String.fromCharCode(value);

    if (character.trim() === '') {
        return '\u00A0\u00A0';
    } else {
        return character;
    }

}


class TextCellView {

    private _value: number;
    private _strValue: string;
    public address: number;

    constructor(address: number, initialValue: number = 0) {

        this._value = initialValue;
        this._strValue = String.fromCharCode(initialValue);
        this.address = address;

    }

    get value() {

        return this._value;

    }

    get strValue() {

        return this._strValue;

    }

    set value(newValue: number) {

        this._value = newValue;
        this._strValue = getStrValue(newValue);

    }

}

export enum TextualDisplayOperationType {

    RESET = 0,
    WRITE_CHAR = 1

}

export interface TextualDisplayOperationParams {

    cell: number;
    value: number;
    strValue: string;

}

enum TextualDisplayOperationState {

    IN_PROGRESS = 0,
    FINISHED = 1

}

export class TextualDisplayOperation implements SystemEvent {

    public operationType: TextualDisplayOperationType;
    public data: TextualDisplayOperationParams;
    public state: TextualDisplayOperationState;

    constructor(operationType: TextualDisplayOperationType, data?: TextualDisplayOperationParams,
                state?: TextualDisplayOperationState) {

        this.operationType = operationType;
        this.data = data;
        this.state = state;

    }

    toString(): string {

        let ret;

        switch (this.operationType) {
            case TextualDisplayOperationType.RESET:
                ret = `TDPL: Reset textual display`;
                break;
            case TextualDisplayOperationType.WRITE_CHAR:
                ret = `TDPL: Write character ${this.data.value}: '${this.data.strValue}' into cell [${Utils.pad(this.data.cell, 16, 2)}]`;
                break;
            default:
                break;
        }

        return ret;

    }

}


@Component({
    selector: 'app-textual-display',
    templateUrl: './textual-display.component.html'
})
export class TextualDisplayComponent {

    public textCellViews: Array<TextCellView> = new Array<TextCellView>(32);

    private textualDisplayOperationSource = new Subject<TextualDisplayOperation>();
    private textualDisplayOperationSource$: Observable<TextualDisplayOperation>;

    constructor(private memoryService: MemoryService,
                private eventsLogService: EventsLogService) {

        for (let i = 0; i < 32; i++) {

            this.textCellViews[i] = new TextCellView(i, 0);

        }

        this.memoryService.addMemoryRegion('TextualDisplayRegion', 0x2E0, 0x2FF,
            undefined, (op) => this.processMemoryOperation(op));

        this.textualDisplayOperationSource$ = this.textualDisplayOperationSource.asObservable();

        this.textualDisplayOperationSource$.subscribe(
            (textualDisplayOperation) => this.processTextualDisplayOperation(textualDisplayOperation)
        );

    }

    private publishTextualDisplayOperation(operation: TextualDisplayOperation) {

        this.eventsLogService.log(operation);
        this.textualDisplayOperationSource.next(operation);

    }

    private fillCharacter(index: number, value: number) {

        this.textCellViews[index].value = value;

    }

    private operationStoreByte(address: number, value: number) {

        const parameters: TextualDisplayOperationParams = {

            cell: address - 0x2E0,
            value: value,
            strValue: getStrValue(value)

        };

        this.publishTextualDisplayOperation(new TextualDisplayOperation(TextualDisplayOperationType.WRITE_CHAR, parameters));

    }

    private operationStoreWord(address: number, value: number) {

        const msb = (value & 0xFF00) >>> 8;
        const lsb = (value & 0x00FF);

        const parameters: TextualDisplayOperationParams = {

            cell: address - 0x2E0,
            value: msb,
            strValue: getStrValue(msb)

        };

        this.publishTextualDisplayOperation(new TextualDisplayOperation(TextualDisplayOperationType.WRITE_CHAR, parameters));

        if ((address + 1) <= 0x2FF) {

            parameters.cell = address - 0x2E0 + 1;
            parameters.value = lsb;
            parameters.strValue = getStrValue(lsb);

            this.publishTextualDisplayOperation(new TextualDisplayOperation(TextualDisplayOperationType.WRITE_CHAR, parameters));

        }

    }

    private processTextualDisplayOperation(textualDisplayOperation: TextualDisplayOperation) {

        switch (textualDisplayOperation.operationType) {

            case TextualDisplayOperationType.WRITE_CHAR:
                const params = textualDisplayOperation.data;
                this.fillCharacter(params.cell, params.value);
                break;
            default:
                break;

        }

    }


    private processMemoryOperation(memoryOperation: MemoryOperation) {

        switch (memoryOperation.operationType) {

            case MemoryOperationType.STORE_BYTE:
                this.operationStoreByte(
                    (<MemoryOperationParamsLoadStore>memoryOperation.data).address,
                    (<MemoryOperationParamsLoadStore>memoryOperation.data).value);
                break;
            case MemoryOperationType.STORE_WORD:
                this.operationStoreWord(
                    (<MemoryOperationParamsLoadStore>memoryOperation.data).address,
                    (<MemoryOperationParamsLoadStore>memoryOperation.data).value);
                break;
            default:
                break;
        }

    }

    public reset() {

        this.publishTextualDisplayOperation(new TextualDisplayOperation(TextualDisplayOperationType.RESET));

        for (let i = 0; i < this.textCellViews.length; i++) {
            this.textCellViews[i].value = 0;
        }

        this.memoryService.storeBytes(0x2E0, 32);

    }

}
