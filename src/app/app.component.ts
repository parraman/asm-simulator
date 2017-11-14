import { Component, ElementRef, ViewChild } from '@angular/core';
import { AssemblerService } from './assembler.service';
import { MemoryService } from './memory.service';
import { ErrorBarService } from './error-bar.service';
import { CPUService } from './cpu.service';

import { Subscription } from 'rxjs/Subscription';
import { Observable } from 'rxjs/Rx';
import { CPURegisterIndex, CPURegisterOperation, CPURegisterOperationType, SRBit } from './cpuregs';
import { IORegMapService } from './ioregmap.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html'
})

export class AppComponent {

    title = 'asm-simulator';

    public codeText = '; Simple example\n; Writes Hello World to the output\n\n	JMP start\n' +
        'hello: DB \"Hello World!\" ; Variable\n       DB 0	; String terminator\n\n' +
        'start:\n	MOV SP, 255     ; Set SP \n	MOV C, hello    ; Point to var \n	MOVB DL, 232	; Point to output\n	CALL print\n' +
        '        HLT             ; Stop execution\n\nprint:			; print(C:*from, D:*to)\n	PUSH A\n' +
        '	PUSH B\n	MOV B, 0\n.loop:\n	MOVB AL, [C]	; Get char from var\n	MOVB [D], AL	; Write to output\n' +
        '	INCB CL\n	INCB DL  \n	CMPB BL, [C]	; Check if end\n	JNZ .loop	; jump if not\n\n	POP B\n	POP A\n	RET';

    public code: Array<number>;
    public mapping: Map<number, number>;
    public labels: Map<string, number>;

    public displayA = false;
    public displayB = false;
    public displayC = false;
    public displayD = false;

    public showInstructions = true;

    public isRunning = false;

    public isCPUHalted = false;

    public speed = 250;

    @ViewChild('codeTextArea') codeTextArea: ElementRef;

    private cpuRegisterOperationSubscription: Subscription;
    private timerSubscription: Subscription;

    constructor (private assemblerService: AssemblerService,
                 private memoryService: MemoryService,
                 private errorBarService: ErrorBarService,
                 private ioRegMapService: IORegMapService,
                 private cpuService: CPUService) {

        this.cpuRegisterOperationSubscription = this.cpuService.cpuRegisterOperation$.subscribe(
            (cpuRegisterOperation) => this.processCPURegisterOperation(cpuRegisterOperation)
        );

    }

    private processCPURegisterOperation(cpuRegisterOperation: CPURegisterOperation) {

        if (cpuRegisterOperation.index === CPURegisterIndex.IP &&
            cpuRegisterOperation.operationType === CPURegisterOperationType.WRITE) {

            if (this.mapping && this.mapping.has(cpuRegisterOperation.value) && this.codeTextArea) {

                this.markLine(this.mapping.get(cpuRegisterOperation.value));

            }

        } else if (cpuRegisterOperation.index === CPURegisterIndex.SR &&
            cpuRegisterOperation.operationType === CPURegisterOperationType.WRITE) {

            if ((cpuRegisterOperation.value & (1 << SRBit.HALT)) !== 0) {

                this.isCPUHalted = true;

                if (this.isRunning === true) {

                    this.isRunning = false;
                    this.timerSubscription.unsubscribe();

                }

            } else {

                this.isCPUHalted = false;

            }

        }

    }

    public assemble() {

        let result;

        try {
            result = this.assemblerService.go(this.codeText);
        } catch (e) {
            if (e.line) {
                this.errorBarService.setErrorMessage(e.line + ': ' + e.error);
            } else if (e.error) {
                this.errorBarService.setErrorMessage(e.error);
            } else {
                this.errorBarService.setErrorMessage(e.toString());
            }
        } finally {

            this.code = result.code;
            this.mapping = result.mapping;
            this.labels = result.labels;

            this.memoryService.storeBytes(0, this.code);

        }
    }

    private markLine(line: number) {

        const element = this.codeTextArea.nativeElement;

        const lines = element.value.split('\n');

        // Calculate start/end
        let startPos = 0;
        for (let x = 0; x < lines.length; x++) {
            if (x === line) {
                break;
            }
            startPos += (lines[x].length + 1);
        }

        const endPos = lines[line].length + startPos;

        if (element.selectionStart !== undefined) {
            element.focus();
            element.selectionStart = startPos;
            element.selectionEnd = endPos;
        }

    }

    public memoryCellClick(address: number) {

        if (this.mapping && this.mapping.has(address) && this.codeTextArea) {

            this.markLine(this.mapping.get(address));

        }

    }

    public executeStep() {

        if (this.isCPUHalted === true) {
            return;
        }

        try {

            this.cpuService.step();

        } catch (e) {

            this.errorBarService.setErrorMessage(e.toString());

        }

    }

    public run() {

        if (this.isCPUHalted === true) {
            return;
        }

        this.isRunning = true;

        this.timerSubscription = Observable.timer(1, this.speed).subscribe(
            (ticks: any) => {

                try {

                    this.cpuService.step();

                } catch (e) {

                    this.errorBarService.setErrorMessage(e.toString());
                    this.isRunning = false;
                    this.timerSubscription.unsubscribe();

                }

            }
        );
    }

    public stop() {

        if (this.timerSubscription && this.timerSubscription.closed === false) {

            this.isRunning = false;
            this.timerSubscription.unsubscribe();

        }

    }

    public reset() {

        this.mapping = undefined;
        this.cpuService.reset();
        this.memoryService.reset();
        this.ioRegMapService.reset();

    }

    public textAreaKeyDown(event: KeyboardEvent) {

        const element = this.codeTextArea.nativeElement;
        const start = element.selectionStart;
        const end = element.selectionEnd;

        element.value = element.value.substring(0, start) + '\t' + element.value.substring(end);
        element.selectionStart = element.selectionEnd = start + 1;

    }

}
