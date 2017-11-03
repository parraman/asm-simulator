import { Component, ElementRef, ViewChild } from '@angular/core';
import { AssemblerService } from './assembler.service';
import { MemoryService } from './memory.service';
import { ErrorBarService } from './error-bar.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html'
})

export class AppComponent {

    title = 'asm-simulator';

    public codeText = '; Simple example\n; Writes Hello World to the output\n\n	JMP start\n' +
        'hello: DB \"Hello World!\" ; Variable\n       DB 0	; String terminator\n\n' +
        'start:\n	MOV C, hello    ; Point to var \n	MOV D, 232	; Point to output\n	CALL print\n' +
        '        HLT             ; Stop execution\n\nprint:			; print(C:*from, D:*to)\n	PUSH A\n' +
        '	PUSH B\n	MOV B, 0\n.loop:\n	MOV A, [C]	; Get char from var\n	MOV [D], A	; Write to output\n' +
        '	INC C\n	INC D  \n	CMP B, [C]	; Check if end\n	JNZ .loop	; jump if not\n\n	POP B\n	POP A\n	RET';

    public code: Array<number>;
    public mapping: Map<number, number>;
    public labels: Map<string, number>;

    public selectedLine = -1;

    @ViewChild('codeTextArea') codeTextArea: ElementRef;

    constructor (private assemblerService: AssemblerService,
                 private memoryService: MemoryService,
                 private errorBarService: ErrorBarService) {}

    public assemble() {

        let result;

        try {
            result = this.assemblerService.go(this.codeText);
        } catch (e) {
            if (e.line) {
                this.errorBarService.setErrorMessage(e.line + ': ' + e.error);
            } else {
                this.errorBarService.setErrorMessage(e.error);
            }
        } finally {

            this.code = result.code;
            this.mapping = result.mapping;
            this.labels = result.labels;

            this.memoryService.multiStore(0, this.code);

        }
    }

    public memoryCellClick(address: number) {

        if (this.mapping && this.mapping.has(address) && this.codeTextArea) {

            this.selectedLine = this.mapping.get(address);

            const element = this.codeTextArea.nativeElement;

            const lines = element.value.split('\n');

            // Calculate start/end
            let startPos = 0;
            for (let x = 0; x < lines.length; x++) {
                if (x === this.selectedLine) {
                    break;
                }
                startPos += (lines[x].length + 1);
            }

            const endPos = lines[this.selectedLine].length + startPos;

            if (element.selectionStart !== undefined) {
                element.focus();
                element.selectionStart = startPos;
                element.selectionEnd = endPos;
            }

        }

    }

}
