import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

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
import { ErrorBarComponent } from './error-bar/error-bar.component';
import { ErrorBarService } from './error-bar.service';
import { AutofocusDirective } from './autofocus.directive';

@NgModule({
    declarations: [
        AppComponent,
        MemoryViewComponent,
        KeypadComponent,
        VisualDisplayComponent,
        TextualDisplayComponent,
        RegistersViewComponent,
        IORegistersViewComponent,
        ErrorBarComponent,
        AutofocusDirective
    ],
    imports: [
        BrowserModule,
        FormsModule
    ],
    providers: [
        MemoryService,
        IORegMapService,
        AssemblerService,
        ErrorBarService
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
