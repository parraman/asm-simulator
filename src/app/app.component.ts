import {Component, ElementRef, ViewChild, AfterViewInit, Renderer2 } from '@angular/core';
import { AssemblerService } from './assembler.service';
import { MemoryService } from './memory.service';
import { ErrorBarService } from './error-bar.service';
import { CPUService } from './cpu.service';

import { Subscription } from 'rxjs/Subscription';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/timer';

import {
    CPURegisterIndex, CPURegisterOperation, CPURegisterOperationType, SRBit,
    CPURegisterRegularOpParams, CPURegisterBitOpParams
} from './cpuregs';
import { IrqCtrlService } from './irqctrl.service';
import { TimerService } from './timer.service';
import { KeypadComponent } from './keypad/keypad.component';
import { VisualDisplayComponent } from './visual-display/visual-display.component';
import { TextualDisplayComponent } from './textual-display/textual-display.component';
import { ErrorBarComponent } from './error-bar/error-bar.component';

import * as CodeMirror from 'codemirror';
import { instructionSet } from './instrset';

const WRAP_CLS = 'CodeMirror-activeline';
const BACK_CLS = 'CodeMirror-activeline-background';
const GUTT_CLS = 'CodeMirror-activeline-gutter';


@Component({
    selector: 'app-root',
    templateUrl: './app.component.html'
})

export class AppComponent implements AfterViewInit {

    title = 'asm-simulator';

    private sample1 = '; Example 1:\n; Writes "Hello World" to the textual display\n\n\tJMP start\n\n' +
        'hello:\tDB \"Hello World!\"\t; Output string\n\t\tDB 0\t\t\t\t; String terminator\n\n' +
        'start:\n\tMOV SP, 255\t\t; Set SP\n\tMOV C, hello\t; Point register C to string\n\tMOV D, 0x2F0\t' +
        '; Point register D to output\n\tCALL print\n' +
        '\tHLT\t\t\t\t; Halt execution\n\nprint:\t\t\t\t; Print string\n\tPUSH A\n' +
        '\tPUSH B\n\tMOV B, 0\n.loop:\n\tMOVB AL, [C]\t; Get character\n\tMOVB [D], AL\t; Write to output\n' +
        '\tINCB CL\n\tINCB DL\n\tCMPB BL, [C]\t; Check if string terminator\n\tJNZ .loop\t\t' +
        '; Jump back to loop if not\n\n\tPOP B\n\tPOP A\n\tRET';

    private sample2 = '; Example 2:\n; Prints a 16x16 sprite into the visual display\n\n\tJMP ' +
        'start\n\nsprite: \n\tDB "\\x0F\\x0F\\x0F\\x0F\\x0F\\x45\\x45\\x45"\n\tDB ' +
        '"\\x45\\x45\\x0F\\x0F\\x0F\\x0F\\x0F\\x0F"\n\tDB ' +
        '"\\x0F\\x0F\\x0F\\x0F\\x45\\x45\\x45\\x45"\n\tDB ' +
        '"\\x45\\x45\\x45\\x45\\x45\\x0F\\x0F\\x0F"\n\tDB ' +
        '"\\x0F\\x0F\\x0F\\x0F\\xE4\\xE4\\xE4\\x17"\n\tDB ' +
        '"\\x17\\xE4\\x17\\x0F\\x0F\\x0F\\x0F\\x0F"\n\tDB ' +
        '"\\x0F\\x0F\\x0F\\xE4\\x17\\xE4\\x17\\x17"\n\tDB ' +
        '"\\x17\\xE4\\x17\\x17\\x17\\x0F\\x0F\\x0F"\n\tDB ' +
        '"\\x0F\\x0F\\x0F\\xE4\\x17\\xE4\\xE4\\x17"\n\tDB ' +
        '"\\x17\\x17\\xE4\\x17\\x17\\x17\\x0F\\x0F"\n\tDB ' +
        '"\\x0F\\x0F\\x0F\\xE4\\xE4\\x17\\x17\\x17"\n\tDB ' +
        '"\\x17\\xE4\\xE4\\xE4\\xE4\\x0F\\x0F\\x0F"\n\tDB ' +
        '"\\x0F\\x0F\\x0F\\x0F\\x0F\\x17\\x17\\x17"\n\tDB ' +
        '"\\x17\\x17\\x17\\x17\\x0F\\x0F\\x0F\\x0F"\n\tDB ' +
        '"\\x0F\\x0F\\x0F\\x0F\\xE4\\xE4\\x45\\xE4"\n\tDB ' +
        '"\\xE4\\xE4\\x0F\\x0F\\x0F\\x0F\\x0F\\x0F"\n\tDB ' +
        '"\\x0F\\x0F\\x0F\\xE4\\xE4\\xE4\\x45\\xE4"\n\tDB ' +
        '"\\xE4\\x45\\xE4\\xE4\\xE4\\x0F\\x0F\\x0F"\n\tDB ' +
        '"\\x0F\\x0F\\xE4\\xE4\\xE4\\xE4\\x45\\x45"\n\tDB ' +
        '"\\x45\\x45\\xE4\\xE4\\xE4\\xE4\\x0F\\x0F"\n\tDB ' +
        '"\\x0F\\x0F\\x17\\x17\\xE4\\x45\\x17\\x45"\n\tDB ' +
        '"\\x45\\x17\\x45\\xE4\\x17\\x17\\x0F\\x0F"\n\tDB ' +
        '"\\x0F\\x0F\\x17\\x17\\x17\\x45\\x45\\x45"\n\tDB ' +
        '"\\x45\\x45\\x45\\x17\\x17\\x17\\x0F\\x0F"\n\tDB ' +
        '"\\x0F\\x0F\\x17\\x17\\x45\\x45\\x45\\x45"\n\tDB ' +
        '"\\x45\\x45\\x45\\x45\\x17\\x17\\x0F\\x0F"\n\tDB ' +
        '"\\x0F\\x0F\\x0F\\x0F\\x45\\x45\\x45\\x0F"\n\tDB ' +
        '"\\x0F\\x45\\x45\\x45\\x0F\\x0F\\x0F\\x0F"\n\tDB ' +
        '"\\x0F\\x0F\\x0F\\xE4\\xE4\\xE4\\x0F\\x0F"\n\tDB ' +
        '"\\x0F\\x0F\\xE4\\xE4\\xE4\\x0F\\x0F\\x0F"\n\tDB ' +
        '"\\x0F\\x0F\\xE4\\xE4\\xE4\\xE4\\x0F\\x0F"\n\tDB ' +
        '"\\x0F\\x0F\\xE4\\xE4\\xE4\\xE4\\x0F\\x0F"\n\nstart:\n\tMOV C, sprite\t; C points to the ' +
        'sprite\n\tMOV D, 0x300\t; D points to the fb\n\n.loop:\n\tMOVB AL, [C]\t; Print ' +
        'all the pixels\n\tMOVB [D], AL\n\tINC C\n\tINC D\n\tCMP D, 0x400\n\tJNZ ' +
        '.loop\n\tHLT\n';

    private sample3 = '; Example 3:\n; Draws a sprite in the visual display that can be\n; moved using ' +
        'the keypad:\n; 2: UP, 4: LEFT; 6: RIGHT; 8: DOWN\n\n\tJMP start\n\tJMP ' +
        'isr\n\nsprite:\tDB "\\x45\\x0F\\x0F\\x45"\t; Sprite line 0\n\t\tDB ' +
        '"\\x0F\\x45\\x45\\x0F"\t; Sprite line 1\n\t\tDB "\\x0F\\x45\\x45\\x0F"\t; Sprite line ' +
        '2\n\t\tDB "\\x45\\x0F\\x0F\\x45"\t; Sprite line 3\n\nclear:  DB "\\x0F\\x0F\\x0F\\x0F"\t; ' +
        'Blank line 0\n\t\tDB "\\x0F\\x0F\\x0F\\x0F"\t; Blank line 1\n\t\tDB ' +
        '"\\x0F\\x0F\\x0F\\x0F"\t; Blank line 2\n\t\tDB "\\x0F\\x0F\\x0F\\x0F"\t; Blank line ' +
        '3\n\npos:\tDB 0\t\t; Current row\n\t\tDB 0\t\t; Current column\n\t\nstart:\n\tMOV ' +
        'SP, 511\t\t; Set SP\n\tMOV C, sprite\t; Set to draw the sprite\n\tCALL draw\t\t; ' +
        'Call drawing function\n\tMOV A, 1\t\t; Set bit 0 of IRQMASK\n\tOUT 0\t\t\t; Unmask ' +
        'keypad irq\n\tSTI\t\t\t\t; Enable interrupts\n\tHLT\t\t\t\t; Halt ' +
        'execution\n\nisr:\n\tPUSH A\n\tPUSH B\n\tIN 6\t\t\t; Load KPDDATA register to ' +
        'A\n\tMOV B, [pos]\t; Load position variable\n\tCMP A, 2\t\t; If key pressed != 2 ' +
        '-> .not2\n\tJNZ .not2\t\t; else\n\tDECB BH\t\t\t; row--\n\tJNC .save\t\t; if row < 0 ' +
        '-> .end\n\tJMP .end\t\t; else -> .save position\n.not2:\n\tCMP A, 4\t\t; If key ' +
        'pressed != 4 -> .not4\n\tJNZ .not4\t\t; else\n\tDECB BL\t\t\t; column--\n\tJNC ' +
        '.save\t\t; if column < 0 -> .end\n\tJMP .end\t\t; else -> .save ' +
        'position\n.not4:\n\tCMP A, 6\t\t; If key pressed != 6 -> .not4\n\tJNZ .not6\t\t; ' +
        'else\n\tINCB BL\t\t\t; column++\n\tCMPB BL, 4\t\t; if column == 4 -> .end\n\tJNZ ' +
        '.save\t\t; else -> .save position\n\tJMP .end\n.not6:\tCMP A, 8\t; If key pressed ' +
        '!= 6 -> .end\n\tJNZ .end\t\t; else\n\tINCB BH\t\t\t; row++\n\tCMPB BH, 4\t\t; if row ' +
        '== 4 -> .end\n\tJZ .end\t\t\n.save:\n\tMOV C, clear\t; Set to clear the ' +
        'sprite\n\tCALL draw\t\t; Call drawing function\n\tMOV [pos], B\t; Store the new ' +
        'position\n\tMOV C, sprite\t; Set to draw the sprite\n\tCALL draw\t\t; Call ' +
        'drawing function\n.end:\tOUT 2\t\t; Write to signal IRQEOI\n\tPOP B\n\tPOP ' +
        'A\n\tIRET\t\t\t; Return from IRQ\n\ndraw:\t\t\t\t; Draw (C: pointer to img)\n\tPUSH ' +
        'A\n\tPUSH B\n\tPUSH C\n\tPUSH D\n\tMOV D, 0x300\t; Point register D to ' +
        'framebuffer\n\tMOV B, [pos]\t; Load current position\n\tMOVB AL, 64\t\t; Initial ' +
        'pixel =\n\tMULB BH\t\t\t; row * 64 + column * 4\n\tADD D, A\t\n\tMOVB AL, ' +
        '4\n\tMULB BL\n\tADD D, A\t\t; D points to initial pixel\n\tMOV A, C\t\t; Point A to ' +
        'the image\n\tMOV C, 0\t\t; CH: total pixel counter\n.line:\t\t\t\t; CL: line pixel ' +
        'counter\\n\n\tMOVB BL, [A]\t; Get pixel to print\n\tMOVB [D], BL\t; Print ' +
        'pixel\n\tINC A\n\tINC D\n\tINCB CL\n\tINCB CH\n\tCMPB CL, 4\t\t; End of current ' +
        'line?\n\tJNZ .line\t\t; NO: keep drawing\n\tMOVB CL, 0\t\t; YES: Next line\n\tADD ' +
        'D, 12\t\t; Pixel + 12 === CRLF\n\tCMPB CH, 16\t\t; End of sprite?\n\tJNZ .line\t\t; ' +
        'Jump back to .line if not\n\tPOP D\n\tPOP C\n\tPOP B\n\tPOP A\n\tRET';

    private sample4 = '; Example 4:\n; Program a periodic interrupt that increments\n; a counter [0 to ' +
        '99] and prints its value into\n; the textual display\n \n\tJMP start\n\tJMP ' +
        'isr\n\ncounter:\t\t; the counter\n\tDB 0\n\tDB 0\n\nstart:\n\tMOV SP, 255\t\t; ' +
        'Set SP\n\tMOV A, 2\t\t; Set bit 1 of IRQMASK\n\tOUT 0\t\t\t; Unmask timer ' +
        'IRQ\n\tMOV A, 0x20\t\t; Set timer preload\n\tOUT 3\n\tSTI\n\tHLT\n\nisr:\n\tPUSH ' +
        'A\n\tPUSH B\n\tPUSH C\n\tMOV A, [counter]\t; Increment the\n\tINC A\t\t\t\t; ' +
        'counter\n\tCMP A, 100\t\t\t; [0 to 99]\n\tJNZ .print\n\tMOV A, 0\n\n.print:\n\tMOV ' +
        '[counter], A\t; Print the\n\tMOV B, A\t\t\t; decimal value\n\tDIV 10\t\t\t\t; of ' +
        'the counter\n\tMOV C, A\n\tMUL 10\n\tSUB B, A\n\tADDB CL, 0x30\n\tADDB BL, ' +
        '0x30\n\tMOVB [0x2F0], CL\n\tMOVB [0x2F1], BL\n\tOUT 2\t\t\t\t; Write to signal ' +
        'IRQEOI\n\tPOP C\n\tPOP B\n\tPOP A\n\tIRET';

    private sample5 = '; Example 5:\n; A user mode task accesses the keypad\n; registers using two ' +
        'system calls. It polls\n; the keypad until a key has been pressed and\n; prints ' +
        'the value on the textual display.\n\n\tJMP start\n\tJMP isr\t\t; Interrupt ' +
        'vector\n\tJMP svc\t\t; System call vector\n\nkeypressed:\t\t; 1 = key ' +
        'pressed\n\tDB 0\t\t; 0 = No key pressed\n\nvalue:\t\t\t; The number of ' +
        'the\n\tDB 0\t\t; key pressed in ASCII\n\nstart:\n\tMOV SP, 0xFF\t; Set ' +
        'Supervisor SP\n\tMOV A, 1\t\t; Set bit 0 of IRQMASK\n\tOUT 0\t\t\t; Unmask keypad ' +
        'IRQ\n\tSTI\t\t\t\t; Enable interrupts\n\tPUSH 0xCF\t\t; Setup User SP\n\tPUSH task\t\t; ' +
        'Setup initial user IP\n\tSRET\t\t\t; Jump to user mode\n\tHLT\t\t\t\t; ' +
        'Parachute\n\nreadchar:\t\t; User space wrapper\n\tMOV A, 0\t; for readchar ' +
        'syscall\n\tSVC\t\t\t; Syscall #0\n\tRET\t\t\t; A -> syscall number\n\nputchar:\t\t; ' +
        'User space wrapper\n\tPUSH A\t\t; for putchar syscall\n\tMOV A, 1\t; Syscall ' +
        '#1\n\tSVC\t\t\t; A -> syscall number\n\tPOP A\t\t; BL -> char to ' +
        'print\n\tRET\n\ntask:\t\t\t; The user task\n\tMOV A, 0\n\tMOV B, 0\nloop:\n\tCALL ' +
        'readchar\t; Polls the keypad\n\tCMPB AH, 1\t\t; using readchar\n\tJNZ ' +
        'loop\n\tMOVB BL, AL\t\t; If key was pressed use\n\tCALL putchar\t; putchar to ' +
        'print it\n\tJMP loop \n\nisr:\t\t\t\n\tPUSH A\t\t; Read the key pressed\n\tIN ' +
        '6\t\t; and store the ASCII\n\tADDB AL, 0x30\n\tMOVB [value], AL\n\tMOVB AL, ' +
        '1\n\tMOVB [keypressed], AL\n\tOUT 2\n\tPOP A\n\tIRET\n\nsvc:\t\t\t\t; Supervisor ' +
        'call\n\tCMP A, 0\t\t; A = syscall number\n\tJNZ .not0\t\t; 0 -> ' +
        'readchar\n\tCLI\n\tMOV A, [keypressed]\t; Write vars\n\tPUSH B\t\t\t\t; with ' +
        'IRQs\n\tMOV B, 0\t\t\t; disabled\n\tMOV [keypressed], B\n\tPOP B\n\tSTI\n\tJMP ' +
        '.return\n.not0:\n\tCMP A, 1\t\t; 1 -> putchar\n\tJNZ .return\n\tMOVB [0x2F0], ' +
        'BL\n.return:\n\tSRET\t\t\t; Return to user space\n';

    public codeText = '';
    private instance: any;

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

    private currentIP = 0;

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
                 private cpuService: CPUService,
                 private irqCtrlService: IrqCtrlService,
                 private timerService: TimerService,
                 private renderer: Renderer2) {

        this.cpuRegisterOperationSubscription = this.cpuService.cpuRegisterOperation$.subscribe(
            (cpuRegisterOperation) => this.processCPURegisterOperation(cpuRegisterOperation)
        );

    }

    private setGutterMarker(lineNumber: number) {

        const info = this.instance.lineInfo(lineNumber);
        if (info.gutterMarkers) {
            this.instance.setGutterMarker(lineNumber, 'breakpoints', null);
        } else {
            const marker = this.renderer.createElement('div');
            this.renderer.setStyle(marker, 'color', '#822');
            this.renderer.setStyle(marker, 'vertical-align', 'middle');
            this.renderer.setStyle(marker, 'text-align', 'center');
            this.renderer.setStyle(marker, 'line-height', '20px');
            this.renderer.setStyle(marker, 'font-size', '80%');
            this.renderer.appendChild(marker, this.renderer.createText('●'));
            this.instance.setGutterMarker(lineNumber, 'breakpoints', marker);
        }

    }

    ngAfterViewInit() {

        const start = [
            // The regex matches the token, the token property contains the type
            {regex: /"(?:[^\\]|\\.)*?(?:"|$)/, token: 'string'},
            {regex: /0x[0-9a-f]+|0o[0-7]+|b[0-1]+|[-+]?\d+/i,
                token: 'number'},
            {regex: /;.*/, token: 'comment'}
        ];

        for (const item of ['AH', 'AL', 'BH', 'BL', 'CH', 'CL', 'DH', 'DL',
                            'SP', 'A', 'B', 'C', 'D']) {
            start.push({regex: new RegExp(item + '\\b'), token: 'variable-3'});
        }

        start.push({regex: /DB\b/, token: 'keyword'});

        for (const item of instructionSet.getMnemonics()) {

            start.push({regex: new RegExp(item + '\\b'), token: 'keyword'});

        }

        start.push({regex: /([.A-Za-z]\w*)/, token: 'variable-2'});

        CodeMirror.defineSimpleMode('asm-mode', {
            // The start state contains the rules that are intially used
            start: start,
            meta: {
                lineComment: ';'
            }
        });

        const element = this.codeTextArea.nativeElement;

        this.instance = CodeMirror.fromTextArea(element, {
            lineNumbers: true,
            scrollEditorOnly: true,
            mode: 'asm-mode',
            gutters: ['CodeMirror-linenumbers', 'breakpoints']
        });

        this.instance.on('gutterClick', (cm, n) => this.setGutterMarker(n));

        this.instance.state.activeLine = undefined;
        this.instance.on('beforeSelectionChange', () => {

            if (this.instance.state.activeLine) {

                this.instance.removeLineClass(this.instance.state.activeLine, 'wrap', WRAP_CLS);
                this.instance.removeLineClass(this.instance.state.activeLine, 'background', BACK_CLS);
                this.instance.removeLineClass(this.instance.state.activeLine, 'gutter', GUTT_CLS);

                this.instance.state.activeLine = undefined;
            }

        });
        this.instance.on('change', () => {
            this.codeText = this.instance.getValue();
        });

    }

    private processCPURegisterOperation(cpuRegisterOperation: CPURegisterOperation) {

        if (cpuRegisterOperation.operationType === CPURegisterOperationType.WRITE &&
            cpuRegisterOperation.data.index === CPURegisterIndex.IP) {

            this.currentIP = cpuRegisterOperation.data.value;

            if (this.isRunning === true) {

                if (this.mapping && this.mapping.has(this.currentIP)) {

                    const lineNumber = this.mapping.get(this.currentIP);
                    const info = this.instance.lineInfo(lineNumber);

                    if (info.gutterMarkers) {

                        this.isRunning = false;
                        if (this.timerSubscription && this.timerSubscription.closed === false) {
                            this.timerSubscription.unsubscribe();
                        }

                    }

                }

            }

            if (this.isRunning === false) {

                if (this.mapping && this.mapping.has(this.currentIP)) {

                    const line = this.mapping.get(this.currentIP);
                    this.markLine(line);

                    const clientHeight = this.instance.getScrollInfo().clientHeight;
                    const scrollTop = this.instance.getScrollInfo().top;
                    const lineCoordinates = this.instance.charCoords({line: line, ch: 0}, 'local');
                    const topLine = this.instance.coordsChar({left: 0, top: scrollTop}, 'local').line;
                    const bottomLine =
                        this.instance.coordsChar({left: 0, top: (scrollTop + clientHeight)}, 'local').line;

                    if (line <= topLine) {
                        this.instance.scrollTo(null, lineCoordinates.top);
                    } else if (line >= bottomLine) {
                        this.instance.scrollTo(null, lineCoordinates.top - clientHeight + 20);
                    }

                }
            }

        } else if (cpuRegisterOperation.operationType === CPURegisterOperationType.WRITE &&
                   (<CPURegisterRegularOpParams>cpuRegisterOperation.data).index === CPURegisterIndex.SR) {

            this.isCPUHalted = (cpuRegisterOperation.data.value & (1 << SRBit.HALT)) !== 0;

        } else if (cpuRegisterOperation.operationType === CPURegisterOperationType.WRITE_BIT &&
                   (<CPURegisterBitOpParams>cpuRegisterOperation.data).index === CPURegisterIndex.SR &&
                   (<CPURegisterBitOpParams>cpuRegisterOperation.data).bitNumber === SRBit.HALT) {

            this.isCPUHalted = cpuRegisterOperation.data.value === 1;

        }

    }

    public assemble() {

        let result;

        try {
            result = this.assemblerService.go(this.codeText);
        } catch (e) {
            if (e.line) {
                this.errorBarService.setErrorMessage(`${e.line}: ${e.error}`);
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

        if (this.instance.state.activeLine !== undefined && this.instance.state.activeLine !== line) {

                this.instance.removeLineClass(this.instance.state.activeLine, 'wrap', WRAP_CLS);
                this.instance.removeLineClass(this.instance.state.activeLine, 'background', BACK_CLS);
                this.instance.removeLineClass(this.instance.state.activeLine, 'gutter', GUTT_CLS);

                this.instance.state.activeLine = undefined;

        }

        if (this.instance.state.activeLine === undefined) {

            this.instance.state.activeLine = line;

            this.instance.addLineClass(this.instance.state.activeLine, 'wrap', WRAP_CLS);
            this.instance.addLineClass(this.instance.state.activeLine, 'background', BACK_CLS);
            this.instance.addLineClass(this.instance.state.activeLine, 'gutter', GUTT_CLS);

        }

    }

    public memoryCellClick(address: number) {

        if (this.mapping && this.mapping.has(address) && this.codeTextArea) {

            const line = this.mapping.get(address);
            this.markLine(line);

            const coordinates = this.instance.charCoords({line: line, ch: 0}, 'local');
            const clientHeight = this.instance.getScrollInfo().clientHeight;
            this.instance.scrollTo(null, (coordinates.top + coordinates.bottom - clientHeight) / 2);

        }

    }

    public executeStep() {

        try {

            this.cpuService.step();

        } catch (e) {

            this.errorBarService.setErrorMessage(e.message);

        }

    }

    public run() {

        this.isRunning = true;

        this.timerSubscription = Observable.timer(1, this.speed).subscribe(
            () => {

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

    public setCodeSample(sampleNum: number) {

        this.reset();

        switch (sampleNum) {
            case 1:
                this.instance.setValue(this.sample1);
                break;
            case 2:
                this.instance.setValue(this.sample2);
                break;
            case 3:
                this.instance.setValue(this.sample3);
                break;
            case 4:
                this.instance.setValue(this.sample4);
                break;
            case 5:
                this.instance.setValue(this.sample5);
                break;
            default:
                break;
        }

    }

}
