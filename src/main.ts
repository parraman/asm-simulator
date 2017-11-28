import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

import * as CodeMirror from 'codemirror';

if (environment.production) {
  enableProdMode();
}

CodeMirror.defineOption('scrollEditorOnly', false, function(cm) {

    const preventScroll = function(event) {

        const delta = 'wheelDelta' in event ? event.wheelDelta : 40 * event.detail;

        const scroll = cm.display.scroller;
        const scrollTop = scroll.scrollTop;
        const scrollHeight = scroll.scrollHeight;
        const height = scroll.clientHeight;

        const up = delta > 0;

        if (!up && ((scrollHeight - height - scrollTop) === 0)) {
            CodeMirror.e_stop(event);
        }

    };

    CodeMirror.on(cm.getScrollerElement(), 'mousewheel', preventScroll);
    CodeMirror.on(cm.getScrollerElement(), 'DOMMouseScroll', preventScroll);
});


platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));
