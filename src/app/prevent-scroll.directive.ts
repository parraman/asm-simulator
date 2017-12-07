import {Directive, ElementRef, HostListener} from '@angular/core';

@Directive({
    selector: '[appPreventScroll]'
})
export class PreventScrollDirective {

    private static prevent(event: any) {
        event.stopPropagation();
        event.preventDefault();
        event.returnValue = false;
        return false;
    }

    constructor(private el: ElementRef) { }

    @HostListener('mousewheel', ['$event'])
    private scrollMouseWheelEventHandler(event: any) {

        const element = this.el.nativeElement;
        const scrollTop = element.scrollTop;
        const scrollHeight = element.scrollHeight;
        const height = element.clientHeight;

        const delta = event.wheelDelta;
        const up = delta > 0;

        if (!up && -delta > scrollHeight - height - scrollTop) {
            // Scrolling down, but this will take us past the bottom.
            element.scrollTop = scrollHeight;
            return PreventScrollDirective.prevent(event);
        }
    }

    @HostListener('DOMMouseScroll', ['$event'])
    private scrollDOMMouseScrollEventHandler(event: any) {

        const element = this.el.nativeElement;
        const scrollTop = element.scrollTop;
        const scrollHeight = element.scrollHeight;
        const height = element.clientHeight;

        const delta = event.detail * -40;
        const up = delta > 0;

        if (!up && -delta > scrollHeight - height - scrollTop) {
            // Scrolling down, but this will take us past the bottom.
            element.scrollTop = scrollHeight;
            return PreventScrollDirective.prevent(event);
        }
    }

}
