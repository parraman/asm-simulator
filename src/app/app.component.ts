import {
    Component, ElementRef, ViewChild,
    AfterViewInit, Renderer2, HostListener, NgZone
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AssemblerService } from './assembler.service';
import { MemoryService } from './memory.service';
import { MessageService } from 'primeng/components/common/messageservice';
import { CPUService } from './cpu.service';

import { CPURegisterIndex } from './cpuregs';

import { MenuItem } from 'primeng/api';

import { Subscription, Observable, timer } from 'rxjs';

import { IrqCtrlService } from './irqctrl.service';
import { TimerService } from './timer.service';
import { KeypadComponent } from './keypad/keypad.component';
import { VisualDisplayComponent } from './visual-display/visual-display.component';
import { TextualDisplayComponent } from './textual-display/textual-display.component';

import * as CodeMirror from 'codemirror';
import { instructionSet } from './instrset';

const WRAP_CLS = 'CodeMirror-activeline';
const BACK_CLS = 'CodeMirror-activeline-background';
const GUTT_CLS = 'CodeMirror-activeline-gutter';

export enum CPUSpeed {

    _4Hz = 0,
    _16Hz = 1,
    _64Hz = 2,
    _256Hz = 3,
    _1kHz = 4,
    _4kHz = 5

}

interface IPanelConfiguration {

    visible: boolean;
    size: number;

}

interface IConfiguration {

    /* CPU Speed */
    cpuSpeed: number;

    ioRegistersPanel: IPanelConfiguration;
    memoryPanel: IPanelConfiguration;
    cpuRegistersPanel: IPanelConfiguration;
    ioDevicesPanel: IPanelConfiguration;
    codePanel: IPanelConfiguration;
    eventsLogPanel: IPanelConfiguration;

}

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    providers: [
        MessageService
    ]
})

export class AppComponent implements AfterViewInit {

    title = 'asm-simulator';

    public codeText = '';
    private instance: any;

    public code: Array<number>;
    public mapping: Map<number, number>;
    public labels: Map<string, number>;

    public displayA = false;
    public displayB = false;
    public displayC = false;
    public displayD = false;

    public isRunning = false;

    public items: MenuItem[];
    public speedItems: MenuItem[];

    public showCentralPane: boolean;

    private resetConfiguration: IConfiguration = {

        cpuSpeed: 0,
        ioRegistersPanel: {
            visible: true,
            size: 25
        },
        memoryPanel: {
            visible: true,
            size: 25
        },
        cpuRegistersPanel: {
            visible: true,
            size: 25
        },
        ioDevicesPanel: {
            visible: true,
            size: 25
        },
        codePanel: {
            visible: true,
            size: 50
        },
        eventsLogPanel: {
            visible: true,
            size: 50
        }
    };

    /* Current configuration */
    public config: IConfiguration;

    private localStorageName = 'asm-simulator-ws';

    private timerSubscription: Subscription;

    @ViewChild('codeTextArea') codeTextArea: ElementRef;
    @ViewChild('fileInput') fileInput: ElementRef;
    @ViewChild('fileDownload') fileDownload: ElementRef;
    @ViewChild(KeypadComponent) keypadComponent: KeypadComponent;
    @ViewChild(VisualDisplayComponent) visualDisplayComponent: VisualDisplayComponent;
    @ViewChild(TextualDisplayComponent) textualDisplayComponent: TextualDisplayComponent;

    @HostListener('window:resize', ['$event'])
    onResize() {

        if (window.innerWidth >= 1400) {
            this.showCentralPane = true;
            this.config.memoryPanel.visible = false;
        } else {
            this.showCentralPane = false;
            this.config.memoryPanel.visible = true;
        }
        this.saveConfig();

    }

    constructor (private assemblerService: AssemblerService,
                 private memoryService: MemoryService,
                 private messageService: MessageService,
                 private cpuService: CPUService,
                 private irqCtrlService: IrqCtrlService,
                 private timerService: TimerService,
                 private http: HttpClient,
                 private renderer: Renderer2,
                 private _ngZone: NgZone) {

        if (localStorage.getItem(this.localStorageName)) {

            this.config = JSON.parse(localStorage.getItem(this.localStorageName));

        } else {

            this.resetConfig();

        }

        if (window.innerWidth >= 1400) {
            this.showCentralPane = true;
            this.config.memoryPanel.visible = false;
        } else {
            this.showCentralPane = false;
            this.config.memoryPanel.visible = true;
        }

        this.speedItems = [
            {
                label: '4 Hz',
                icon: this.config.cpuSpeed === CPUSpeed._4Hz ? 'pi pi-fw pi-check' : undefined,
                command: (event) => {
                    this.speedItems[this.config.cpuSpeed].icon = undefined;
                    this.config.cpuSpeed = CPUSpeed._4Hz;
                    event.item.icon = 'pi pi-fw pi-check';
                    this.saveConfig();
                }
            },
            {
                label: '16 Hz',
                icon: this.config.cpuSpeed === CPUSpeed._16Hz ? 'pi pi-fw pi-check' : undefined,
                command: (event) => {
                    this.speedItems[this.config.cpuSpeed].icon = undefined;
                    this.config.cpuSpeed = CPUSpeed._16Hz;
                    event.item.icon = 'pi pi-fw pi-check';
                    this.saveConfig();
                }
            },
            {
                label: '64 Hz',
                icon: this.config.cpuSpeed === CPUSpeed._64Hz ? 'pi pi-fw pi-check' : undefined,
                command: (event) => {
                    this.speedItems[this.config.cpuSpeed].icon = undefined;
                    this.config.cpuSpeed = CPUSpeed._64Hz;
                    event.item.icon = 'pi pi-fw pi-check';
                    this.saveConfig();
                }
            },
            {
                label: '256 Hz',
                icon: this.config.cpuSpeed === CPUSpeed._256Hz ? 'pi pi-fw pi-check' : undefined,
                command: (event) => {
                    this.speedItems[this.config.cpuSpeed].icon = undefined;
                    this.config.cpuSpeed = CPUSpeed._256Hz;
                    event.item.icon = 'pi pi-fw pi-check';
                    this.saveConfig();
                }
            },
            {
                label: '1 kHz',
                icon: this.config.cpuSpeed === CPUSpeed._1kHz ? 'pi pi-fw pi-check' : undefined,
                command: (event) => {
                    this.speedItems[this.config.cpuSpeed].icon = undefined;
                    this.config.cpuSpeed = CPUSpeed._1kHz;
                    event.item.icon = 'pi pi-fw pi-check';
                    this.saveConfig();
                }
            },
            {
                label: '4 kHz',
                icon: this.config.cpuSpeed === CPUSpeed._4kHz ? 'pi pi-fw pi-check' : undefined,
                command: (event) => {
                    this.speedItems[this.config.cpuSpeed].icon = undefined;
                    this.config.cpuSpeed = CPUSpeed._4kHz;
                    event.item.icon = 'pi pi-fw pi-check';
                    this.saveConfig();
                }
            },
        ];

        this.items = [
            {
                label: 'File',
                items: [
                    {
                        label: 'Upload',
                        icon: 'pi pi-fw pi-upload',
                        command: () => this.fileInput.nativeElement.click()
                    },
                    {
                        label: 'Download',
                        icon: 'pi pi-fw pi-download',
                        command: () => {

                            const blob = new Blob([this.codeText], { type: 'text/plain;charset=utf-8;' });
                            const url = URL.createObjectURL(blob);
                            this.renderer.setAttribute(this.fileDownload.nativeElement, 'href', url);
                            this.fileDownload.nativeElement.click();

                        }
                    },
                    {
                        label: 'Samples',
                        items: [
                            {
                                label: 'Hello World',
                                command: () => this.setCodeSample(1)
                            },
                            {
                                label: 'Draw Sprite',
                                command: () => this.setCodeSample(2)
                            },
                            {
                                label: 'Basic Interrupt Handling',
                                command: () => this.setCodeSample(3)
                            },
                            {
                                label: 'System Calls',
                                command: () => this.setCodeSample(4)
                            },
                            {
                                label: 'Exceptions',
                                command: () => this.setCodeSample(5)
                            },
                            {
                                label: 'Sched & Dispatch',
                                command: () => this.setCodeSample(6)
                            }
                        ]
                    },
                    {
                        label: 'Documentation',
                        icon: 'pi pi-fw pi-question-circle',
                        command: () => window.open("https://asm-simulator.readthedocs.io/en/latest/index.html")
                    },
                ]
            },
            {
                label: 'View',
                items: [
                    {
                        label: 'I/O Registers',
                        icon: this.config.ioRegistersPanel.visible ? 'pi pi-fw pi-check' : undefined,
                        command: (event) => {
                            if (this.config.ioRegistersPanel.visible === true) {
                                this.config.ioRegistersPanel.visible = false;
                                event.item.icon = undefined;
                            } else {
                                this.config.ioRegistersPanel.visible = true;
                                event.item.icon = 'pi pi-fw pi-check';
                            }
                            this.saveConfig();
                        }
                    },
                    {
                        label: 'Events Log',
                        icon: this.config.eventsLogPanel.visible ? 'pi pi-fw pi-check' : undefined,
                        command: (event) => {
                            if (this.config.eventsLogPanel.visible === true) {
                                this.config.eventsLogPanel.visible = false;
                                event.item.icon = undefined;
                            } else {
                                this.config.eventsLogPanel.visible = true;
                                event.item.icon = 'pi pi-fw pi-check';
                            }
                            this.saveConfig();
                        }
                    }
                ]
            },
            {
                label: 'Configuration',
                icon: 'pi pi-fw pi-wrench',
                items: [
                    {
                        label: 'Speed',
                        items: this.speedItems
                    }
                ]
            },
            {
                label: 'Assemble',
                icon: 'pi pi-fw pi-arrow-right',
                command: () => this.assemble()
            },
            {
                label: 'Run',
                icon: 'pi pi-fw pi-play',
                styleClass: 'menubar-button-run',
                command: (event) => {
                    if (this.isRunning === true) {
                        this.stop();
                    } else {
                        event.item.icon = 'pi pi-fw pi-stop';
                        event.item.label = 'Stop';

                        this.run();
                    }
                }
            },
            {
                label: 'Step',
                icon: 'pi pi-fw pi-forward',
                command: () => this.executeStep()
            },
            {
                label: 'Reset',
                icon: 'pi pi-fw pi-power-off',
                command: () => this.reset()
            }
        ];

    }

    private pushErrorMessage(detail: string) {
        this.messageService.clear();
        this.messageService.add({severity: 'error', detail: detail});
    }

    public onFileChange(event: any) {

        const file = event.target.files[0];

        const reader = new FileReader();

        reader.onload = () => this.instance.setValue(reader.result);
        reader.readAsText(file);

    }

    private resetConfig() {

        this.config = JSON.parse(JSON.stringify(this.resetConfiguration));
        localStorage.removeItem(this.localStorageName);

    }

    private saveConfig() {
        localStorage.setItem(this.localStorageName, JSON.stringify(this.config));
    }

    private updatePanelSizes(splitNumber: number, sizes: Array<number>) {

        if (splitNumber === 0) {
            // We are on the left pane, and there is only one gutter
            this.config.codePanel.size = sizes[0];
            this.config.eventsLogPanel.size = sizes[1];
        } else {
            // We are on the right pane
            this.config.ioDevicesPanel.size = sizes[0];
            this.config.cpuRegistersPanel.size = sizes[1];
            if (this.config.memoryPanel.visible === true &&
                this.config.ioRegistersPanel.visible === true) {
                this.config.memoryPanel.size = sizes[2];
                this.config.ioRegistersPanel.size = sizes[3];
            } else if (this.config.memoryPanel.visible === true) {
                this.config.memoryPanel.size = sizes[2];
            } else if (this.config.ioRegistersPanel.visible === true) {
                this.config.ioRegistersPanel.size = sizes[2];
            }
        }
        this.saveConfig();

    }

    public onDragEnd(splitNumber: number,
                     e: { gutterNum: number, sizes: Array<number> }) {

        this._ngZone.run(() => { this.updatePanelSizes(splitNumber, e.sizes); });

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
        start.push({regex: /DW\b/, token: 'keyword'});
        start.push({regex: /ORG\b/, token: 'keyword'});
        start.push({regex: /EQU\b/, token: 'keyword'});

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
            viewportMargin: Infinity,
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

    public assemble() {

        let result;

        this.messageService.clear();

        try {
            result = this.assemblerService.go(this.codeText);
        } catch (e) {
            if (e.line) {
                this.pushErrorMessage(`${e.line}: ${e.error}`);
            } else if (e.error) {
                this.pushErrorMessage(e.error);
            } else {
                this.pushErrorMessage(e.toString());
            }

            return;
        }

        this.code = result.code;
        this.mapping = result.mapping;
        this.labels = result.labels;

        this.memoryService.storeBytes(0, this.code.length, this.code);

    }

    private scrollToLine(line: number) {

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
            this.scrollToLine(line);

        }

    }

    public executeStep() {

        try {

            this.cpuService.step();

            if (this.mapping && this.mapping.has(this.cpuService.IP.silentValue)) {

                const line = this.mapping.get(this.cpuService.IP.silentValue);
                this.markLine(line);
                this.scrollToLine(line);

            }

        } catch (e) {

            this.pushErrorMessage(e.message);

        }

    }

    public run() {

        this.isRunning = true;

        let steps = 1;
        let period;

        switch (this.config.cpuSpeed) {

            case CPUSpeed._4Hz: {
                period = 250;
                break;
            }
            case CPUSpeed._16Hz: {
                period = 125;
                break;
            }
            case CPUSpeed._64Hz: {
                period = 32;
                steps = 2;
                break;
            }
            case CPUSpeed._256Hz: {
                period = 32;
                steps = 8;
                break;
            }
            case CPUSpeed._1kHz: {
                period = 32;
                steps = 32;
                break;
            }
            case CPUSpeed._4kHz: {
                period = 32;
                steps = 128;
                break;
            }

        }

        this.timerSubscription = timer(1, period).subscribe(
            () => {

                try {

                    for (let i = 0; i < steps; i++) {

                        this.cpuService.step();

                        if (this.mapping && this.mapping.has(this.cpuService.IP.silentValue)) {

                            const line = this.mapping.get(this.cpuService.IP.silentValue);
                            const info = this.instance.lineInfo(line);

                            if (info.gutterMarkers) {

                                this.stop();

                                this.markLine(line);
                                this.scrollToLine(line);
                                break;

                            }

                        }
                    }

                } catch (e) {

                    this.pushErrorMessage(e.toString());
                    this.stop();

                }

            }
        );
    }

    public stop() {

        this.isRunning = false;

        this.items[4].icon = 'pi pi-fw pi-play';
        this.items[4].label = 'Run';

        if (this.timerSubscription && this.timerSubscription.closed === false) {

            this.timerSubscription.unsubscribe();

        }

    }

    public reset() {

        if (this.isRunning === true) {
            this.stop();
        }

        this.mapping = undefined;
        this.cpuService.reset();
        this.memoryService.reset();
        this.irqCtrlService.reset();
        this.timerService.reset();

        this.keypadComponent.reset();
        this.visualDisplayComponent.reset();
        this.textualDisplayComponent.reset();
        this.messageService.clear();

    }

    public setCodeSample(sampleNum: number) {

        this.reset();

        this.http.get(`assets/samples/sample${sampleNum}.asm`, {responseType: 'text'})
            .subscribe((text: string) => this.instance.setValue(text));

    }

    public toggleDisplayRegister(registerIndex: CPURegisterIndex) {

        switch (registerIndex) {
            case CPURegisterIndex.A:
                this.displayA = !this.displayA;
                break;
            case CPURegisterIndex.B:
                this.displayB = !this.displayB;
                break;
            case CPURegisterIndex.C:
                this.displayC = !this.displayC;
                break;
            case CPURegisterIndex.D:
                this.displayD = !this.displayD;
                break;
        }

    }

}
