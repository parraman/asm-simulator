import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';

import { Subject, Observable } from 'rxjs';

import {
    MemoryOperation, MemoryService, MemoryOperationParamsLoadStore,
    MemoryOperationType
} from '../memory.service';

import { Utils } from '../utils';
import { EventsLogService, SystemEvent } from '../events-log.service';

const COLOR_PALETTE = [

    '#000000', '#000055', '#0000AA', '#0000FF', '#002400', '#002455', '#0024AA', '#0024FF', /* 0x00..0x07 */
    '#004800', '#004855', '#0048AA', '#0048FF', '#006C00', '#006C55', '#006CAA', '#006CFF', /* 0x08..0x0F */
    '#009000', '#009055', '#0090AA', '#0090FF', '#00B400', '#00B455', '#00B4AA', '#00B4FF', /* 0x10..0x17 */
    '#00D800', '#00D855', '#00D8AA', '#00D8FF', '#00FC00', '#00FC55', '#00FCAA', '#00FCFF', /* 0x18..0x1F */
    '#240000', '#240055', '#2400AA', '#2400FF', '#242400', '#242455', '#2424AA', '#2424FF', /* 0x20..0x27 */
    '#244800', '#244855', '#2448AA', '#2448FF', '#246C00', '#246C55', '#246CAA', '#246CFF', /* 0x28..0x2F */
    '#249000', '#249055', '#2490AA', '#2490FF', '#24B400', '#24B455', '#24B4AA', '#24B4FF', /* 0x30..0x37 */
    '#24D800', '#24D855', '#24D8AA', '#24D8FF', '#24FC00', '#24FC55', '#24FCAA', '#24FCFF', /* 0x38..0x3F */
    '#480000', '#480055', '#4800AA', '#4800FF', '#482400', '#482455', '#4824AA', '#4824FF', /* 0x40..0x47 */
    '#484800', '#484855', '#4848AA', '#4848FF', '#486C00', '#486C55', '#486CAA', '#486CFF', /* 0x48..0x4F */
    '#489000', '#489055', '#4890AA', '#4890FF', '#48B400', '#48B455', '#48B4AA', '#48B4FF', /* 0x50..0x57 */
    '#48D800', '#48D855', '#48D8AA', '#48D8FF', '#48FC00', '#48FC55', '#48FCAA', '#48FCFF', /* 0x58..0x5F */
    '#6C0000', '#6C0055', '#6C00AA', '#6C00FF', '#6C2400', '#6C2455', '#6C24AA', '#6C24FF', /* 0x60..0x67 */
    '#6C4800', '#6C4855', '#6C48AA', '#6C48FF', '#6C6C00', '#6C6C55', '#6C6CAA', '#6C6CFF', /* 0x68..0x6F */
    '#6C9000', '#6C9055', '#6C90AA', '#6C90FF', '#6CB400', '#6CB455', '#6CB4AA', '#6CB4FF', /* 0x70..0x77 */
    '#6CD800', '#6CD855', '#6CD8AA', '#6CD8FF', '#6CFC00', '#6CFC55', '#6CFCAA', '#6CFCFF', /* 0x78..0x7F */
    '#900000', '#900055', '#9000AA', '#9000FF', '#902400', '#902455', '#9024AA', '#9024FF', /* 0x80..0x87 */
    '#904800', '#904855', '#9048AA', '#9048FF', '#906C00', '#906C55', '#906CAA', '#906CFF', /* 0x88..0x8F */
    '#909000', '#909055', '#9090AA', '#9090FF', '#90B400', '#90B455', '#90B4AA', '#90B4FF', /* 0x90..0x97 */
    '#90D800', '#90D855', '#90D8AA', '#90D8FF', '#90FC00', '#90FC55', '#90FCAA', '#90FCFF', /* 0x98..0x9F */
    '#B40000', '#B40055', '#B400AA', '#B400FF', '#B42400', '#B42455', '#B424AA', '#B424FF', /* 0xA0..0xA7 */
    '#B44800', '#B44855', '#B448AA', '#B448FF', '#B46C00', '#B46C55', '#B46CAA', '#B46CFF', /* 0xA8..0xAF */
    '#B49000', '#B49055', '#B490AA', '#B490FF', '#B4B400', '#B4B455', '#B4B4AA', '#B4B4FF', /* 0xB0..0xB7 */
    '#B4D800', '#B4D855', '#B4D8AA', '#B4D8FF', '#B4FC00', '#B4FC55', '#B4FCAA', '#B4FCFF', /* 0xB8..0xBF */
    '#D80000', '#D80055', '#D800AA', '#D800FF', '#D82400', '#D82455', '#D824AA', '#D824FF', /* 0xC0..0xC7 */
    '#D84800', '#D84855', '#D848AA', '#D848FF', '#D86C00', '#D86C55', '#D86CAA', '#D86CFF', /* 0xC8..0xCF */
    '#D89000', '#D89055', '#D890AA', '#D890FF', '#D8B400', '#D8B455', '#D8B4AA', '#D8B4FF', /* 0xD0..0xD7 */
    '#D8D800', '#D8D855', '#D8D8AA', '#D8D8FF', '#D8FC00', '#D8FC55', '#D8FCAA', '#D8FCFF', /* 0xD8..0xDF */
    '#FC0000', '#FC0055', '#FC00AA', '#FC00FF', '#FC2400', '#FC2455', '#FC24AA', '#FC24FF', /* 0xE0..0xE7 */
    '#FC4800', '#FC4855', '#FC48AA', '#FC48FF', '#FC6C00', '#FC6C55', '#FC6CAA', '#FC6CFF', /* 0xE8..0xEF */
    '#FC9000', '#FC9055', '#FC90AA', '#FC90FF', '#FCB400', '#FCB455', '#FCB4AA', '#FCB4FF', /* 0xF0..0xF7 */
    '#FCD800', '#FCD855', '#FCD8AA', '#FCD8FF', '#FCFC00', '#FCFC55', '#FCFCAA', '#FFFFFF', /* 0xF8..0xFF */

];

const RECTX = 6;
const RECTY = 6;

export enum VisualDisplayOperationType {

    RESET = 0,
    WRITE_PIXEL = 1

}

export interface VisualDisplayOperationParams {

    pixel: number;
    coordX: number;
    coordY: number;
    color: number;

}

enum VisualDisplayOperationState {

    IN_PROGRESS = 0,
    FINISHED = 1

}

export class VisualDisplayOperation implements SystemEvent {

    public operationType: VisualDisplayOperationType;
    public data: VisualDisplayOperationParams;
    public state: VisualDisplayOperationState;

    constructor(operationType: VisualDisplayOperationType, data?: VisualDisplayOperationParams,
                state?: VisualDisplayOperationState) {

        this.operationType = operationType;
        this.data = data;
        this.state = state;

    }

    toString(): string {

        let ret;

        switch (this.operationType) {
            case VisualDisplayOperationType.RESET:
                ret = `VDPL: Reset visual display`;
                break;
            case VisualDisplayOperationType.WRITE_PIXEL:
                ret = `VDPL: Write pixel ${this.data.pixel} (x: ${this.data.coordX}, y: ${this.data.coordY}) ` +
                      `with color 0x${Utils.pad(this.data.color, 16, 2)}`;
                break;
            default:
                break;
        }

        return ret;

    }

}


@Component({
    selector: 'app-visual-display',
    templateUrl: './visual-display.component.html'
})
export class VisualDisplayComponent implements AfterViewInit {

    @ViewChild('display') display: ElementRef;

    private canvas: any;
    private context: any;

    private visualDisplayOperationSource = new Subject<VisualDisplayOperation>();
    private visualDisplayOperationSource$: Observable<VisualDisplayOperation>;

    private initialValues = Array<number>(256);

    constructor(private memoryService: MemoryService,
                private eventsLogService: EventsLogService) {

        for (let i = 0; i < 256; i++) {
            this.initialValues[i] = 0xFF;
        }

        this.memoryService.addMemoryRegion('VisualDisplayRegion', 0x300, 0x3FF,
            this.initialValues, (op) => this.processMemoryOperation(op));

        this.visualDisplayOperationSource$ = this.visualDisplayOperationSource.asObservable();

        this.visualDisplayOperationSource$.subscribe(
            (visualDisplayOperation) => this.processVisualDisplayOperation(visualDisplayOperation)
        );

    }

    private publishVisualDisplayOperation(operation: VisualDisplayOperation) {

        this.eventsLogService.log(operation);
        this.visualDisplayOperationSource.next(operation);

    }

    private operationStoreByte(address: number, value: number) {

        const offset = address - 0x300;
        const x = offset % 16;
        const y = Math.floor(offset / 16);

        const parameters: VisualDisplayOperationParams = {

            pixel: offset,
            coordX: x,
            coordY: y,
            color: value

        };

        this.publishVisualDisplayOperation(new VisualDisplayOperation(VisualDisplayOperationType.WRITE_PIXEL, parameters));

    }

    private operationStoreWord(address: number, value: number) {

        const offset = address - 0x300;
        const msb = (value & 0xFF00) >>> 8;
        const lsb = (value & 0x00FF);

        let x = offset % 16;
        let y = Math.floor(offset / 16);

        const parameters: VisualDisplayOperationParams = {

            pixel: offset,
            coordX: x,
            coordY: y,
            color: msb

        };

        this.publishVisualDisplayOperation(new VisualDisplayOperation(VisualDisplayOperationType.WRITE_PIXEL, parameters));

        if ((offset + 1) <= 255) {
            x = (offset + 1) % 16;
            y = Math.floor((offset + 1) / 16);

            parameters.pixel = offset + 1;
            parameters.coordX = x;
            parameters.coordY = y;
            parameters.color = lsb;

            this.publishVisualDisplayOperation(new VisualDisplayOperation(VisualDisplayOperationType.WRITE_PIXEL, parameters));
        }

    }

    public reset() {

        this.publishVisualDisplayOperation(new VisualDisplayOperation(VisualDisplayOperationType.RESET));

        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.memoryService.storeBytes(0x300, 256, this.initialValues);

    }

    private processVisualDisplayOperation(visualDisplayOperation: VisualDisplayOperation) {

        switch (visualDisplayOperation.operationType) {

            case VisualDisplayOperationType.WRITE_PIXEL:
                const params = visualDisplayOperation.data;
                this.fillRect(params.coordX, params.coordY, params.color);
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

    private fillRect (x: number, y: number, color: number) {
        this.context.fillStyle = COLOR_PALETTE[color];
        this.context.fillRect(x * RECTX, y * RECTY, RECTX, RECTY);
    }

    ngAfterViewInit() {

        this.canvas = this.display.nativeElement;
        this.context = this.canvas.getContext('2d');

    }

}
