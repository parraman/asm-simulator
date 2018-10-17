import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

import * as CodeMirror from 'codemirror';

if (environment.production) {
  enableProdMode();
}

CodeMirror.defineOption('scrollEditorOnly', false, function(cm) {

    const preventScrollPropagation = function(event) {
        event.stopPropagation();
        event.preventDefault();
        event.returnValue = false;
        return false;
    };

    const mouseWheelEventHandler = function(event) {

        const delta = event.wheelDelta;

        const scroll = cm.display.scroller;
        const scrollTop = scroll.scrollTop;
        const scrollHeight = scroll.scrollHeight;
        const height = scroll.clientHeight;

        const up = delta > 0;

        if (!up && ((scrollHeight - height - scrollTop) === 0)) {
            preventScrollPropagation(event);
        }

    };

    const DOMMouseScrollEventHandler = function(event) {

        const delta = event.detail * -40;

        const scroll = cm.display.scroller;
        const scrollTop = scroll.scrollTop;
        const scrollHeight = scroll.scrollHeight;
        const height = scroll.clientHeight;

        const up = delta > 0;

        if (!up && ((scrollHeight - height - scrollTop) === 0)) {
            preventScrollPropagation(event);
        }

    };

    CodeMirror.on(cm.getScrollerElement(), 'mousewheel', mouseWheelEventHandler);
    CodeMirror.on(cm.getScrollerElement(), 'DOMMouseScroll', DOMMouseScrollEventHandler);
});


platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));

