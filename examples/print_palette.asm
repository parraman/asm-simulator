	MOV A, 0
	MOV D, 0x300

.loop:

	MOVB [D], AL
	INCB AL
	INC D
	CMP D, 0x400
	JNZ .loop
	HLT

