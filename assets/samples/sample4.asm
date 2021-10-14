; Example 3:
; A user mode task accesses the keypad and the
; text display using two non-blocking system 
; calls. The task polls the keypad until a key
; has been pressed and prints the value on the
; text display.

	JMP boot 
	JMP isr		; Interrupt vector
	JMP svc		; System call vector

sStackTop   EQU 0x0FF   ; Initial Supervisor SP
uStackTop   EQU 0x1FF   ; Initial User Task SP
txtDisplay  EQU 0x2E0

keypressed:		; 1 = key pressed
	DB 0		; 0 = No key pressed

value:			; The number of the
	DB 0		; key pressed in ASCII

boot:
	MOV SP, sStackTop	; Set Supervisor SP
	MOV A, 1			; Set bit 0 of IRQMASK
	OUT 0				; Unmask keypad IRQ
	MOV A, 0x01FF		; Set the end of the
	OUT 8				; protection to 0x01FF
	MOV A, 0x0109		; Protection in seg. mode
	OUT 7				; from 0x0100, S=1, U=0
	PUSH 0x0010			; User Task SR: IRQMASK = 1
	PUSH uStackTop		; User Task SP = 0x1FF
	PUSH task			; User Task IP = task
	SRET				; Jump to user mode
	HLT					; Parachute

isr:			
	PUSH A		; Read the key pressed
	IN 6		; and store the ASCII
	MOVB [value], AL
	MOVB AL, 1
	MOVB [keypressed], AL
	MOV A, 1
	OUT 2		; Write to signal IRQEOI
	POP A
	IRET

svc:				; Supervisor call
	CMP A, 0		; A = syscall number
	JNZ .not0		; 0 -> readchar
	CLI
	MOV A, [keypressed]	; Write vars
	PUSH B				; with IRQs
	MOV B, 0			; disabled
	MOV [keypressed], B
	POP B
	STI
	JMP .return
.not0:
	CMP A, 1		; 1 -> putchar
	JNZ .return
	MOVB [txtDisplay], BL
.return:
	SRET			; Return to user space

	ORG 0x100	; Following instructions
				; will be assembled at 0x100

task:			; The user task
	MOV A, 0
	MOV B, 0
loop:
	CALL readchar	; Polls the keypad
	CMPB AH, 1		; using readchar
	JNZ loop
	MOVB BL, AL		; If key was pressed use
	CALL putchar	; putchar to print it
	JMP loop 

readchar:		; User space wrapper
	MOV A, 0	; for readchar syscall
	SVC			; Syscall #0
	RET			; A -> syscall number

putchar:		; User space wrapper
	PUSH A		; for putchar syscall
	MOV A, 1	; Syscall #1
	SVC			; A -> syscall number
	POP A		; BL -> char to print
	RET
