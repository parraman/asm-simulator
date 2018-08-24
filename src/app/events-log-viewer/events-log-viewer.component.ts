import {
    AfterViewInit, Component, Input,
    ViewChild, ViewChildren, ElementRef, QueryList
} from '@angular/core';

import { SystemEvent, EventsLogService, LoggedEvent, SystemEventGroupMark } from '../events-log.service';
import { MemoryOperation, MemoryOperationType } from '../memory.service';
import { ControlUnitOperation } from '../cpu.service';
import { ALUOperation } from '../alu';
import { CPURegisterOperation } from '../cpuregs';
import { IORegisterOperation, IORegisterOperationType } from '../ioregmap.service';
import { IrqCtrlOperation } from '../irqctrl.service';
import { TimerOperation } from '../timer.service';
import { VisualDisplayOperation } from '../visual-display/visual-display.component';
import { TextualDisplayOperation } from '../textual-display/textual-display.component';
import { KeypadOperation } from '../keypad/keypad.component';

import { SelectItem } from 'primeng/api';

class LogLine {

    public text: string;
    public style: string;

    constructor(text: string, style: string) {

        this.text = text;
        this.style = style;

    }

}

@Component({
  selector: 'app-events-log-viewer',
  templateUrl: './events-log-viewer.component.html'
})
export class EventsLogViewerComponent implements AfterViewInit {

    @Input() isRunning: boolean;
    @ViewChild('logLinesContainer') logLinesContainer: ElementRef;
    @ViewChildren('logLinesItems') logLinesItems: QueryList<any>;

    public enableLogging = false;

    public loggingSources: SelectItem[];
    public selectedSources = [
        'ControlUnit', 'CPURegisters', 'ALU',
        'Memory', 'IORegisters', 'IRQController',
        'Timer', 'TextualDisplay', 'VisualDisplay',
        'Keypad'
    ];

    public logLines: Array<LogLine> = [];

    private eventGroups: Array<SystemEvent> = [];

    private static getStyle(systemEvent: SystemEvent): string {

        let ret;

        if (systemEvent instanceof MemoryOperation) {
            ret = 'memory-event';
        } else if (systemEvent instanceof ControlUnitOperation) {
            ret = 'control-unit-event';
        } else if (systemEvent instanceof ALUOperation) {
            ret = 'aluevent';
        } else if (systemEvent instanceof CPURegisterOperation) {
            ret = 'cpuregister-event';
        } else if (systemEvent instanceof IORegisterOperation) {
            ret = 'ioregister-event';
        } else if (systemEvent instanceof IrqCtrlOperation) {
            ret = 'irq-ctrl-event';
        } else if (systemEvent instanceof TimerOperation) {
            ret = 'timer-event';
        } else if (systemEvent instanceof VisualDisplayOperation) {
            ret = 'visual-display-event';
        } else if (systemEvent instanceof TextualDisplayOperation) {
            ret = 'textual-display-event';
        } else if (systemEvent instanceof KeypadOperation) {
            ret = 'keypad-event';
        }

        return ret;

    }

    constructor(private eventsLogService: EventsLogService) {
   
        this.loggingSources = [
            {
                label: 'Control Unit',
                value: 'ControlUnit'
            },
            {
                label: 'CPU Registers',
                value: 'CPURegisters'
            },
            {
                label: 'Arithmetic Logic Unit',
                value: 'ALU'
            },
            {
                label: 'Memory',
                value: 'Memory'
            },
            {
                label: 'I/O Registers',
                value: 'IORegisters'
            },
            {
                label: 'IRQ Controller',
                value: 'IRQController'
            },
            {
                label: 'Timer',
                value: 'Timer'
            },
            {
                label: 'Textual Display',
                value: 'TextualDisplay'
            },
            {
                label: 'Visual Display',
                value: 'VisualDisplay'
            },
            {
                label: 'Keypad',
                value: 'Keypad'
            },
        ];
   
    }

    ngAfterViewInit() {

        this.logLinesItems.changes.subscribe(() => this.scrollToBottom());

        this.eventsLogService.eventsLog$.subscribe((loggedEvent) => this.processLoggedEvent(loggedEvent));

    }

    public clearLogLines() {
        this.logLines = [];
    }

    private scrollToBottom() {

        const element = this.logLinesContainer.nativeElement;
        try {
            element.scrollTop = element.scrollHeight;
        } catch (error) {}

    }

    private getTextLine(loggedEvent: LoggedEvent): string {

        return `${loggedEvent.time}: ${'----'.repeat(this.eventGroups.length)} ` +
               `${loggedEvent.systemEvent.toString()}`;

    }


    private isEventEnabled(systemEvent: SystemEvent): boolean {

        let ret = false;

        if (systemEvent instanceof MemoryOperation && this.selectedSources.includes('Memory') && (
            systemEvent.operationType !== MemoryOperationType.RESET &&
            systemEvent.operationType !== MemoryOperationType.ADD_REGION &&
            systemEvent.operationType !== MemoryOperationType.STORE_BYTES)) {
                ret = true;
        } else if (systemEvent instanceof ControlUnitOperation && this.selectedSources.includes('ControlUnit')) {
            ret = true;
        } else if (systemEvent instanceof ALUOperation && this.selectedSources.includes('ALU')) {
            ret = true;
        } else if (systemEvent instanceof CPURegisterOperation && this.selectedSources.includes('CPURegisters')) {
            ret = true;
        } else if (systemEvent instanceof IORegisterOperation && this.selectedSources.includes('IORegisters') &&
            (systemEvent.operationType !== IORegisterOperationType.ADD_REGISTER)) {
            ret = true;
        } else if (systemEvent instanceof IrqCtrlOperation && this.selectedSources.includes('IRQController')) {
            ret = true;
        } else if (systemEvent instanceof TimerOperation && this.selectedSources.includes('Timer')) {
            ret = true;
        } else if (systemEvent instanceof VisualDisplayOperation && this.selectedSources.includes('VisualDisplay')) {
            ret = true;
        } else if (systemEvent instanceof TextualDisplayOperation && this.selectedSources.includes('TextualDisplay')) {
            ret = true;
        } else if (systemEvent instanceof KeypadOperation && this.selectedSources.includes('Keypad')) {
            ret = true;
        }

        return ret;

    }

    private pushNewLine(loggedEvent: LoggedEvent) {

        if (this.isEventEnabled(loggedEvent.systemEvent)) {
            const newLine = new LogLine(this.getTextLine(loggedEvent), EventsLogViewerComponent.getStyle(loggedEvent.systemEvent));
            this.logLines.push(newLine);
        }

    }

    private processLoggedEvent(loggedEvent: LoggedEvent) {

        if (this.isRunning === true || this.enableLogging === false) {
            return;
        }

        if (loggedEvent.flushGroups === true) {
            this.eventGroups = [];
        }

        if (loggedEvent.systemEvent instanceof SystemEventGroupMark) {

            const groupMark = <SystemEventGroupMark>loggedEvent.systemEvent;
            const systemEvent = groupMark.systemEvent;

            if (this.isEventEnabled(systemEvent) && groupMark.startGroup === true) {
                this.pushNewLine({ time: loggedEvent.time, systemEvent: systemEvent, flushGroups: false });
                this.eventGroups.push(systemEvent);
            } else {
                this.eventGroups.splice(this.eventGroups.indexOf(systemEvent));
            }

        } else {
            this.pushNewLine(loggedEvent);
        }

    }

}
