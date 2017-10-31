import { Component, OnInit, Directive, AfterViewInit, ElementRef } from '@angular/core';
import { MemoryService } from '../memory.service';

@Directive({
    selector: '[appAutofocus]'
})
export class MemoryCellAutofocusDirective implements AfterViewInit {

    constructor(private el: ElementRef) {}

    ngAfterViewInit() {
        this.el.nativeElement.focus();
    }
}


@Component({
    selector: 'app-memory-view',
    templateUrl: './memory-view.component.html',
    styleUrls: ['./memory-view.component.css']
})
export class MemoryViewComponent implements OnInit {

    public memoryColsIndexes: string[] = [];
    public memoryRowsIndexes: string[] = [];

    public editingCell = -1;
    public newCellValue: number;

    public pad(n: number, radix: number, width: number, zeroChar: string = '0'): string {

        const num = n.toString(radix).toUpperCase();
        return num.length >= width ? num : new Array(width - num.length + 1).join('0') + num;

    }

    constructor(public memoryService: MemoryService) {

        for (const i of Array.from({length: 16}, (value, key) => key)) {

            this.memoryColsIndexes.push(this.pad(i, 16, 1));

        }

        for (const i of Array.from({length: memoryService.size / 16}, (value, key) => key)) {

            this.memoryRowsIndexes.push(this.pad(i, 16, 3));

        }

    }

    ngOnInit() {
    }

    public setCellValue(index: number) {

        this.memoryService.store(index, this.newCellValue);
        this.editingCell = -1;

    }

}
