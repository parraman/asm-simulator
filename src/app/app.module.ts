import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { PanelModule } from 'primeng/panel';
import { TableModule } from 'primeng/table';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { MultiSelectModule } from 'primeng/multiselect';
import { MessagesModule } from 'primeng/messages';
import { MessageModule } from 'primeng/message';

import { AngularSplitModule } from './angular-split/modules/angularSplit.module';

import { AppComponent } from './app.component';
import { MemoryViewComponent } from './memory-view/memory-view.component';
import { KeypadComponent } from './keypad/keypad.component';
import { VisualDisplayComponent } from './visual-display/visual-display.component';
import { TextualDisplayComponent } from './textual-display/textual-display.component';
import { RegistersViewComponent } from './registers-view/registers-view.component';
import { IORegistersViewComponent } from './ioregisters-view/ioregisters-view.component';

import { MemoryService } from './memory.service';
import { IORegMapService} from './ioregmap.service';
import { AssemblerService } from './assembler.service';
import { AutofocusDirective } from './autofocus.directive';
import { IrqCtrlService } from './irqctrl.service';
import { CPUService } from './cpu.service';
import { TimerService } from './timer.service';
import { EventsLogViewerComponent } from './events-log-viewer/events-log-viewer.component';
import { ClockService } from './clock.service';
import { EventsLogService } from './events-log.service';

@NgModule({
    declarations: [
        AppComponent,
        MemoryViewComponent,
        KeypadComponent,
        VisualDisplayComponent,
        TextualDisplayComponent,
        RegistersViewComponent,
        IORegistersViewComponent,
        AutofocusDirective,
        EventsLogViewerComponent
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        HttpClientModule,
        MenubarModule,
        ButtonModule,
        PanelModule,
        TableModule,
        ToggleButtonModule,
        MultiSelectModule,
        MessagesModule,
        MessageModule,
        AngularSplitModule
    ],
    providers: [
        MemoryService,
        IORegMapService,
        AssemblerService,
        IrqCtrlService,
        CPUService,
        TimerService,
        ClockService,
        EventsLogService
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
