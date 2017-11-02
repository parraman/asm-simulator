import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { MemoryViewComponent, MemoryCellAutofocusDirective } from './memory-view/memory-view.component';
import { KeypadComponent } from './keypad/keypad.component';
import { VisualDisplayComponent } from './visual-display/visual-display.component';
import { TextualDisplayComponent } from './textual-display/textual-display.component';
import { RegistersViewComponent } from './registers-view/registers-view.component';
import { IoregistersViewComponent } from './ioregisters-view/ioregisters-view.component';

import { MemoryService } from './memory.service';
import { IORegMapService} from './ioregmap.service';
import { AssemblerService } from './assembler.service';

@NgModule({
    declarations: [
        AppComponent,
        MemoryViewComponent,
        KeypadComponent,
        VisualDisplayComponent,
        TextualDisplayComponent,
        RegistersViewComponent,
        MemoryCellAutofocusDirective,
        IoregistersViewComponent
    ],
    imports: [
        BrowserModule,
        FormsModule
    ],
    providers: [
        MemoryService,
        IORegMapService,
        AssemblerService
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
