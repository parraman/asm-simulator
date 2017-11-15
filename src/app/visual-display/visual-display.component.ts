import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';

import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';

import { MemoryOperation, MemoryService,
         MemoryCellType, MemoryOperationType } from '../memory.service';

const COLOR_PALETTE = [

    '#000000', '#252525', '#343434', '#4E4E4E', '#686868', '#757575', '#8E8E8E', '#A4A4A4', /* 0x00..0x07 */
    '#B8B8B8', '#C5C5C5', '#D0D0D0', '#D7D7D7', '#E1E1E1', '#EAEAEA', '#F4F4F4', '#FFFFFF', /* 0x08..0x0F */
    '#412000', '#542800', '#763700', '#9A5000', '#C36806', '#E47B07', '#FF911A', '#FFAB1D', /* 0x10..0x17 */
    '#FFC51F', '#FFD03B', '#FFD84C', '#FFE651', '#FFF456', '#FFF970', '#FFFF90', '#FFFFAA', /* 0x18..0x1F */
    '#451904', '#721E11', '#9F241E', '#B33A20', '#C85120', '#E36920', '#FC8120', '#FD8C25', /* 0x20..0x27 */
    '#FE982C', '#FFAE38', '#FFB946', '#FFBF51', '#FFC66D', '#FFD587', '#FFE498', '#FFCADE', /* 0x28..0x2F */
    '#5D1F0C', '#7A240D', '#982C0E', '#B02F0F', '#BF3624', '#D34E2A', '#E7623E', '#F36E4A', /* 0x30..0x37 */
    '#FD7854', '#FF8A6A', '#FF987C', '#FFA48B', '#FFB39E', '#FFC2B2', '#FFD0C3', '#FFDAD0', /* 0x38..0x3F */
    '#4A1700', '#721F00', '#A81300', '#C8210A', '#DF2512', '#EC3B24', '#FA5236', '#FC6148', /* 0x40..0x47 */
    '#FF705F', '#FF7E7E', '#FF8F8F', '#FF9D9E', '#FFABAD', '#FFB9BD', '#FFC7CE', '#FFCADE', /* 0x48..0x4F */
    '#490036', '#66004B', '#80035F', '#950F74', '#AA2288', '#BA3D99', '#CA4DA9', '#D75AB6', /* 0x50..0x57 */
    '#E467C3', '#EF72CE', '#FB7EDA', '#FF8DE1', '#FF9DE5', '#FFA5E7', '#FFAFEA', '#FFB8EC', /* 0x58..0x5F */
    '#48036C', '#5C0488', '#650D90', '#7B23A7', '#933BBF', '#9D45C9', '#A74FD3', '#B25ADE', /* 0x60..0x67 */
    '#BD65E9', '#C56DF1', '#CE76FA', '#D583FF', '#DA90FF', '#DE9CFF', '#E2A9FF', '#E6B6FF', /* 0x68..0x6F */
    '#051E81', '#0626A5', '#082FCA', '#263DD4', '#444CDE', '#4F5AEC', '#5A68FF', '#6575FF', /* 0x70..0x77 */
    '#7183FF', '#8091FF', '#90A0FF', '#97A9FF', '#9FB2FF', '#AFBEFF', '#C0CBFF', '#CDD3FF', /* 0x78..0x7F */
    '#0B0779', '#201C8E', '#3531A3', '#4642B4', '#5753C5', '#615DCF', '#6D69DB', '#7B77E9', /* 0x80..0x87 */
    '#8985F7', '#918DFF', '#9C98FF', '#A7A4FF', '#B2AFFF', '#BBB8FF', '#C3C1FF', '#D3D1FF', /* 0x88..0x8F */
    '#1D295A', '#1D3876', '#1D4892', '#1D5CAC', '#1D71C6', '#3286CF', '#489BD9', '#4EA8EC', /* 0x90..0x97 */
    '#55B6FF', '#69CAFF', '#74CBFF', '#82D3FF', '#8DDAFF', '#9FD4FF', '#B4E2FF', '#C0EBFF', /* 0x98..0x9F */
    '#004B59', '#005D6E', '#006F84', '#00849C', '#0099BF', '#00ABCA', '#00BCDE', '#00D0F5', /* 0xA0..0xA7 */
    '#10DCFF', '#3EE1FF', '#64E7FF', '#76EAFF', '#8BEDFF', '#9AEFFF', '#B1F3FF', '#C7F6FF', /* 0xA8..0xAF */
    '#004800', '#005400', '#036B03', '#0E760E', '#188018', '#279227', '#36A436', '#4EB94E', /* 0xB0..0xB7 */
    '#51CD51', '#72DA72', '#7CE47C', '#85ED85', '#99F299', '#B3F7B3', '#C3F9C3', '#CDFCCD', /* 0xB8..0xBF */
    '#164000', '#1C5300', '#236600', '#287800', '#2E8C00', '#3A980C', '#47A519', '#51AF23', /* 0xC0..0xC7 */
    '#5CBA2E', '#71CF43', '#85E357', '#8DEB5F', '#97F569', '#A0FE72', '#B1FF8A', '#BCFF9A', /* 0xC8..0xCF */
    '#2C3500', '#384400', '#445200', '#495600', '#607100', '#6C7F00', '#798D0A', '#8B9F1C', /* 0xD0..0xD7 */
    '#9EB22F', '#ABBF3C', '#B8CC49', '#C2D653', '#CDE153', '#DBEF6C', '#E8FC79', '#F2FFAB', /* 0xD8..0xDF */
    '#463A09', '#4D3F09', '#544509', '#6C5809', '#907609', '#AB8B0A', '#C1A120', '#D0B02F', /* 0xE0..0xE7 */
    '#DEBE3D', '#E6C645', '#EDCD4C', '#F5D862', '#FBE276', '#FCEE98', '#FDF3A9', '#FDF3BE', /* 0xE8..0xEF */
    '#401A02', '#581F05', '#702408', '#8D3A13', '#AB511F', '#B56427', '#BF7730', '#D0853A', /* 0xF0..0xF7 */
    '#E19344', '#EDA04E', '#F9AD58', '#FCB75C', '#FFC160', '#FFCA69', '#FFCF7E', '#FFDA96'  /* 0xF8..0xFF */

];

const RECTX = 6;
const RECTY = 6;

@Component({
    selector: 'app-visual-display',
    templateUrl: './visual-display.component.html'
})
export class VisualDisplayComponent implements OnInit, AfterViewInit {

    @ViewChild('display') display: ElementRef;

    private canvas: any;
    private context: any;

    private memoryOperationSource = new Subject<MemoryOperation>();

    private memoryOperationSource$: Observable<MemoryOperation>;

    constructor(private memoryService: MemoryService) {

        this.memoryOperationSource$ = this.memoryOperationSource.asObservable();

        this.memoryOperationSource$.subscribe(
            (memoryOperation) => this.processMemoryOperation(memoryOperation)
        );

    }

    ngOnInit() {

        this.memoryService.addMemoryRegion('VisualDisplayRegion', 0x300, 0x3FF,
            MemoryCellType.READ_WRITE, 0, this.memoryOperationSource);

    }

    private operationStoreByte(address: number, value: number) {

        const offset = address - 0x300;
        const x = offset % 16;
        const y = Math.floor(offset / 16);

        this.fillRect(x, y, value);

    }

    private operationStoreWord(address: number, value: number) {

        const offset = address - 0x300;
        const msb = (value & 0xFF00) >>> 8;
        const lsb = (value & 0x00FF);

        let x = offset % 16;
        let y = Math.floor(offset / 16);

        this.fillRect(x, y, msb);

        if ((offset + 1) <= 255) {
            x = (offset + 1) % 16;
            y = Math.floor((offset + 1) / 16);

            this.fillRect(x, y, lsb);
        }

    }

    private operationReset() {

        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    }

    private processMemoryOperation(memoryOperation: MemoryOperation) {

        switch (memoryOperation.operationType) {

            case MemoryOperationType.STORE_BYTE:
                this.operationStoreByte(
                    memoryOperation.data.get('address'),
                    memoryOperation.data.get('value'));
                break;
            case MemoryOperationType.STORE_WORD:
                this.operationStoreByte(
                    memoryOperation.data.get('address'),
                    memoryOperation.data.get('value'));
                break;
            case MemoryOperationType.RESET:
                this.operationReset();
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
