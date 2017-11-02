import { Component } from '@angular/core';
import { AssemblerService } from './assembler.service';
import { MemoryService } from './memory.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html'
})

export class AppComponent {

    title = 'asm-simulator';

    public code = '; Simple example\n; Writes Hello World to the output\n\n	JMP start\n' +
        'hello: DB \"Hello World!\" ; Variable\n       DB 0	; String terminator\n\n' +
        'start:\n	MOV C, hello    ; Point to var \n	MOV D, 232	; Point to output\n	CALL print\n' +
        '        HLT             ; Stop execution\n\nprint:			; print(C:*from, D:*to)\n	PUSH A\n' +
        '	PUSH B\n	MOV B, 0\n.loop:\n	MOV A, [C]	; Get char from var\n	MOV [D], A	; Write to output\n' +
        '	INC C\n	INC D  \n	CMP B, [C]	; Check if end\n	JNZ .loop	; jump if not\n\n	POP B\n	POP A\n	RET';

    constructor (public assemblerService: AssemblerService, public memoryService: MemoryService) {}

    public assemble() {

        const result = this.assemblerService.go(this.code);

        for (let i = 0; i < result.code.length; i++) {

            this.memoryService.store(i, result.code[i]);

        }

    }

}
