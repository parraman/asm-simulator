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

    public enableControlUnit = true;
    public enableCPURegisters = true;
    public enableALU = true;
    public enableMemory = true;
    public enableIORegisters = true;
    public enableIRQController = true;
    public enableTimer = true;
    public enableTextualDisplay = true;
    public enableVisualDisplay = true;
    public enableKeypad = true;

    public logLines: Array<LogLine> = [];

    private eventGroups: Array<SystemEvent> = [];

    constructor(private eventsLogService: EventsLogService) { }

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

        if (systemEvent instanceof MemoryOperation && this.enableMemory === true && (
            systemEvent.operationType !== MemoryOperationType.RESET &&
            systemEvent.operationType !== MemoryOperationType.ADD_REGION &&
            systemEvent.operationType !== MemoryOperationType.STORE_BYTES)) {
                ret = true;
        } else if (systemEvent instanceof ControlUnitOperation && this.enableControlUnit === true) {
            ret = true;
        } else if (systemEvent instanceof ALUOperation && this.enableALU === true) {
            ret = true;
        } else if (systemEvent instanceof CPURegisterOperation && this.enableCPURegisters === true) {
            ret = true;
        } else if (systemEvent instanceof IORegisterOperation && this.enableIORegisters === true &&
            (systemEvent.operationType !== IORegisterOperationType.ADD_REGISTER)) {
            ret = true;
        } else if (systemEvent instanceof IrqCtrlOperation && this.enableIRQController === true) {
            ret = true;
        } else if (systemEvent instanceof TimerOperation && this.enableTimer === true) {
            ret = true;
        } else if (systemEvent instanceof VisualDisplayOperation && this.enableVisualDisplay === true) {
            ret = true;
        } else if (systemEvent instanceof TextualDisplayOperation && this.enableTextualDisplay === true) {
            ret = true;
        } else if (systemEvent instanceof KeypadOperation && this.enableKeypad === true) {
            ret = true;
        }

        return ret;

    }

    private pushNewLine(loggedEvent: LoggedEvent) {

        if (this.isEventEnabled(loggedEvent.systemEvent)) {
            const style = loggedEvent.systemEvent.constructor.name.replace(/Operation/, 'Event')
                            .replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
            const newLine = new LogLine(this.getTextLine(loggedEvent), style);
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
