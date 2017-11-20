import { Component, ElementRef, ViewChild } from '@angular/core';
import { AssemblerService } from './assembler.service';
import { MemoryService } from './memory.service';
import { ErrorBarService } from './error-bar.service';
import { CPUService } from './cpu.service';

import { Subscription } from 'rxjs/Subscription';
import { Observable } from 'rxjs/Rx';
import { CPURegisterIndex, CPURegisterOperation, CPURegisterOperationType, SRBit } from './cpuregs';
import { IORegMapService } from './ioregmap.service';
import { IrqCtrlService } from './irqctrl.service';
import { TimerService } from './timer.service';
import { KeypadComponent } from './keypad/keypad.component';
import { VisualDisplayComponent } from './visual-display/visual-display.component';
import { TextualDisplayComponent } from './textual-display/textual-display.component';
import { ErrorBarComponent } from './error-bar/error-bar.component';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html'
})

export class AppComponent {

    title = 'asm-simulator';

    public sample1 = '; Example 1:\n; Writes "Hello World" to the textual display\n\n\tJMP start\n' +
        'hello:\tDB \"Hello World!\"\t; Output string\n\tDB 0\t\t\t; String terminator\n\n' +
        'start:\n\tMOV SP, 255\t; Set SP\n\tMOV C, hello\t; Point register C to string\n\tMOV D, 0x2F0\t' +
        '; Point register D to output\n\tCALL print\n' +
        '\tHLT\t\t; Halt execution\n\nprint:\t\t\t; Print string\n\tPUSH A\n' +
        '\tPUSH B\n\tMOV B, 0\n.loop:\n\tMOVB AL, [C]\t; Get character\n\tMOVB [D], AL\t; Write to output\n' +
        '\tINCB CL\n\tINCB DL\n\tCMPB BL, [C]\t; Check if string terminator\n\tJNZ .loop\t' +
        '; Jump back to loop if not\n\n\tPOP B\n\tPOP A\n\tRET';

    public sample3 = '; Example 3:\n; Draws a sprite in the visual display that can be\n; moved using ' +
        'the keypad:\n; 2: UP, 4: LEFT; 6: RIGHT; 8: DOWN\n\n\tJMP start\n\tJMP ' +
        'isr\n\nsprite:\tDB "\\x45\\x0F\\x0F\\x45"\t; Sprite line 0\n\tDB ' +
        '"\\x0F\\x45\\x45\\x0F"\t; Sprite line 1\n\tDB "\\x0F\\x45\\x45\\x0F"\t; Sprite line ' +
        '2\n\tDB "\\x45\\x0F\\x0F\\x45"\t; Sprite line 3\nclear:  DB "\\x0F\\x0F\\x0F\\x0F"\t; ' +
        'Blank line 0\n\tDB "\\x0F\\x0F\\x0F\\x0F"\t; Blank line 0\n\tDB ' +
        '"\\x0F\\x0F\\x0F\\x0F"\t; Blank line 0\n\tDB "\\x0F\\x0F\\x0F\\x0F"\t; Blank line ' +
        '0\n\npos:\tDB 0\t\t; Current row\n\tDB 0\t\t; Current column\n\t\nstart:\n\tMOV ' +
        'SP, 511\t; Set SP\n\tMOV C, sprite\t; Set to draw the sprite\n\tCALL draw\t; ' +
        'Call drawing function\n\tMOV A, 1\t; Set bit 0 of IRQMASK\n\tOUT 0\t\t; Unmask ' +
        'keypad irq\n\tSTI\t\t; Enable interrupts\n\tHLT\t\t; Halt ' +
        'execution\n\nisr:\n\tPUSH A\n\tPUSH B\n\tIN 6\t\t; Load KPDDATA register to ' +
        'A\n\tMOV B, [pos]\t; Load position variable\n\tCMP A, 2\t; If key pressed != 2 ' +
        '-> .not2\n\tJNZ .not2\t; else\n\tDECB BH\t\t; row--\n\tJNC .save\t; if row < 0 ' +
        '-> .end\n\tJMP .end\t; else -> .save position\n.not2:\tCMP A, 4\t; If key ' +
        'pressed != 4 -> .not4\n\tJNZ .not4\t; else\n\tDECB BL\t\t; column--\n\tJNC ' +
        '.save\t; if column < 0 -> .end\n\tJMP .end\t; else -> .save ' +
        'position\n.not4:\tCMP A, 6\t; If key pressed != 6 -> .not4\n\tJNZ .not6\t; ' +
        'else\n\tINCB BL\t\t; column++\n\tCMPB BL, 4\t; if column == 4 -> .end\n\tJNZ ' +
        '.save\t; else -> .save position\n\tJMP .end\n.not6:\tCMP A, 8\t; If key pressed ' +
        '!= 6 -> .end\n\tJNZ .end\t; else\n\tINCB BH\t\t; row++\n\tCMPB BH, 4\t; if row ' +
        '== 4 -> .end\n\tJZ .end\t\t\n.save:\tMOV C, clear\t; Set to clear the ' +
        'sprite\n\tCALL draw\t; Call drawing function\n\tMOV [pos], B\t; Store the new ' +
        'position\n\tMOV C, sprite\t; Set to draw the sprite\n\tCALL draw\t; Call ' +
        'drawing function\n.end:\tOUT 2\t\t; Write to signal IRQEOI\n\tPOP B\n\tPOP ' +
        'A\n\tIRET\t\t; Return from IRQ\n\ndraw:\t\t\t; Draw (C: pointer to img)\n\tPUSH ' +
        'A\n\tPUSH B\n\tPUSH C\n\tPUSH D\n\tMOV D, 0x300\t; Point register D to ' +
        'framebuffer\n\tMOV B, [pos]\t; Load current position\n\tMOVB AL, 64\t; Initial ' +
        'pixel =\n\tMULB BH\t\t; row * 64 + column * 4\n\tADD D, A\t\n\tMOVB AL, ' +
        '4\n\tMULB BL\n\tADD D, A\t; D points to initial pixel\n\tMOV A, C\t; Point A to ' +
        'the image\n\tMOV C, 0\t; CH: total pixel counter\n\t\t\t; CL: line pixel ' +
        'counter\n.line:\tMOVB BL, [A]\t; Get pixel to print\n\tMOVB [D], BL\t; Print ' +
        'pixel\n\tINC A\n\tINC D\n\tINCB CL\n\tINCB CH\n\tCMPB CL, 4\t; End of current ' +
        'line?\n\tJNZ .line\t; NO: keep drawing\n\tMOVB CL, 0\t; YES: Next line\n\tADD ' +
        'D, 12\t; Pixel + 12 === CRLF\n\tCMPB CH, 16\t; End of sprite?\n\tJNZ .line\t; ' +
        'Jump back to .line if not\n\tPOP D\n\tPOP C\n\tPOP B\n\tPOP A\n\tRET';

    public codeText = '';

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
    @ViewChild(KeypadComponent) keypadComponent: KeypadComponent;
    @ViewChild(VisualDisplayComponent) visualDisplayComponent: VisualDisplayComponent;
    @ViewChild(TextualDisplayComponent) textualDisplayComponent: TextualDisplayComponent;
    @ViewChild(ErrorBarComponent) errorBar: ErrorBarComponent;

    private cpuRegisterOperationSubscription: Subscription;
    private timerSubscription: Subscription;

    constructor (private assemblerService: AssemblerService,
                 private memoryService: MemoryService,
                 private errorBarService: ErrorBarService,
                 private ioRegMapService: IORegMapService,
                 private cpuService: CPUService,
                 private irqCtrlService: IrqCtrlService,
                 private timerService: TimerService) {

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

            this.isCPUHalted = (cpuRegisterOperation.value & (1 << SRBit.HALT)) !== 0;

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

            return;
        }

        this.code = result.code;
        this.mapping = result.mapping;
        this.labels = result.labels;

        this.memoryService.storeBytes(0, this.code.length, this.code);

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

        try {

            this.cpuService.step();

        } catch (e) {

            this.errorBarService.setErrorMessage(e.toString());

        }

    }

    public run() {

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

        if (this.timerSubscription && this.timerSubscription.closed === false) {

            this.isRunning = false;
            this.timerSubscription.unsubscribe();

        }

        this.mapping = undefined;
        this.cpuService.reset();
        this.memoryService.reset();
        this.irqCtrlService.reset();
        this.timerService.reset();

        this.keypadComponent.reset();
        this.visualDisplayComponent.reset();
        this.textualDisplayComponent.reset();
        this.errorBar.reset();

    }

    public textAreaKeyDown(event: KeyboardEvent) {

        const element = this.codeTextArea.nativeElement;
        const start = element.selectionStart;
        const end = element.selectionEnd;

        element.value = element.value.substring(0, start) + '\t' + element.value.substring(end);
        element.selectionStart = element.selectionEnd = start + 1;

    }

    public setCodeSample(sampleNum: number) {

        this.reset();

        switch (sampleNum) {
            case 1:
                this.codeText = this.sample1;
                break;
            case 3:
                this.codeText = this.sample3;
                break;
            default:
                break;
        }

    }

}
