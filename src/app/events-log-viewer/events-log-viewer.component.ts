import { 
    AfterViewInit, Component, Input,
    ViewChild, ViewChildren, ElementRef, QueryList
} from '@angular/core';

import { EventsLogService, LoggedEvent } from '../events-log.service';
import { MemoryOperation, MemoryOperationType } from '../memory.service';
import { ControlUnitOperation } from '../cpu.service';
import { ALUOperation } from '../alu';

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
    public enableTextualDisplay = true;
    public enableVisualDisplay = true;
    public enableKeypad = true;

    public logLines: Array<LogLine> = [];

    constructor(private eventsLogService: EventsLogService) { }

    ngAfterViewInit() {

        this.logLinesItems.changes.subscribe(() => this.scrollToBottom());

        this.eventsLogService.eventsLog$.subscribe((loggedEvent) => this.processLoggedEvent(loggedEvent));

    }

    private scrollToBottom() {

        const element = this.logLinesContainer.nativeElement;
        try {
            element.scrollTop = element.scrollHeight;
        } catch (error) {}

    }

    private processLoggedEvent(loggedEvent: LoggedEvent) {

        if (this.isRunning === true || this.enableLogging === false) {
            return;
        }

        if (loggedEvent.systemEvent instanceof MemoryOperation && this.enableMemory === true) {

            if (loggedEvent.systemEvent.operationType !== MemoryOperationType.RESET &&
                loggedEvent.systemEvent.operationType !== MemoryOperationType.ADD_REGION &&
                loggedEvent.systemEvent.operationType !== MemoryOperationType.STORE_BYTES) {

                const newLine = new LogLine(`${loggedEvent.time}: ${loggedEvent.systemEvent.toString()}`,
                    `memory-operation-event`);
                this.logLines.push(newLine);

            }

        } else if (loggedEvent.systemEvent instanceof ControlUnitOperation && this.enableControlUnit === true) {

            const newLine = new LogLine(`${loggedEvent.time}: ${loggedEvent.systemEvent.toString()}`,
                    `control-unit-event`);
            this.logLines.push(newLine);

        } else if (loggedEvent.systemEvent instanceof ALUOperation && this.enableALU === true) {

            const newLine = new LogLine(`${loggedEvent.time}: ${loggedEvent.systemEvent.toString()}`,
                    `alu-event`);
            this.logLines.push(newLine);

        }

    }

}
