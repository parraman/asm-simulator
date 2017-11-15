	JMP start
	JMP isr

start:

	MOV SP, 0xFF
	MOV A, 1
	OUT 0
	STI
	HLT

isr:

	PUSH A
	IN 3
	ADD A, 0x30
	MOVB [0x2F0], AL
	IN 2
	POP A
	IRET

