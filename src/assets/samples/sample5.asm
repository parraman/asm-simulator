; Example 4:
; A user mode task accesses the keypad using
; a blocking system call to read a PIN until
; the pad key (#) is pressed. The values of the
; keys being pressed are stored in a buffer and
; later checked against a stored PIN.
; The user function that reads the PIN has a bug,
; and it does not check the number of keys pressed
; against the size of the buffer. If the user
; enters a PIN too large it provokes a memory
; exception. The exception handler prints an error
; message on the text display.

	JMP boot 
	JMP isr		; Interrupt vector
	JMP svc		; System call vector
    JMP exc		; Exception vector

sStackTop   EQU 0x1FF   ; Initial Supervisor SP
uStackTop   EQU 0x2DF   ; Initial User Task SP

boot:
	MOV SP, sStackTop	; Set Supervisor SP
	MOV A, 1			; Set bit 0 of IRQMASK
	OUT 0				; Unmask keypad IRQ
	MOV A, 0x02DF		; Set the end of the
	OUT 8				; protection to 0x02DF
	MOV A, 0x0209		; Protection in seg. mode
	OUT 7				; from 0x0100, S=1, U=0
	PUSH 0x0010			; User Task SR: IRQMASK = 1
	PUSH uStackTop		; User Task SP = 0x02DF
	PUSH task			; User Task IP = task
	SRET				; Jump to user mode
	HLT					; Parachute

keypressed:		; 1 = key pressed
	DB 0		; 0 = No key pressed

value:			; The number of the
	DB 0		; key pressed in ASCII

isr:			
	PUSH A
    PUSH B		; Read the key pressed
	IN 6		; and store the ASCII
    MOVB [value], AL
	MOVB AL, 1
	MOVB [keypressed], AL
	MOV A, 1
	OUT 2		; Write to signal IRQEOI
    MOV B, [blocked_sp]
    CMP B, 0	; Check if the task is
    JZ .end_isr	; being blocked
    POP B       ; If it is -> unblock it
    MOV A, [keypressed]
    MOV [keypressed], 0
    MOV SP, [blocked_sp]
    MOV [blocked_sp], 0
    IRET
.end_isr:
	POP B
	POP A
	IRET

blocked_sp:
	DW 0

put_char_ptr:
	DW 0x2E0

; The implementation of the read_key
; system call causes a system halt if no
; key was pressed. This effectively provokes
; a blocking of the user task until a key is
; pressed. In order to resume the user task,
; the system call saves the SP that points
; to the syscall frame so that it can be
; recovered from the ISR
svc:				; Supervisor call
	CMP A, 0		; A = syscall number
	JNZ .not0		; 0 -> read_key
	CLI				; Check values with
	MOV A, [keypressed]	; IRQs disabled
  	CMPB AH, 1			; If no key was
	JZ .end_read_key	; pressed -> BLOCK
    MOV [blocked_sp], SP
    STI
    HLT
.end_read_key:
	PUSH B				; If a key was pressed
	MOV B, 0			; just return as usual
	MOV [keypressed], B
	POP B
	JMP .return
.not0:
	CMP A, 1		; 1 -> put_char
	JNZ .return
    PUSH C
    MOV C, [put_char_ptr]
	MOVB [C], BL
    INC C
    CMP C, 0x0300
    JNZ .end_put_char
    MOV C, 0x02E0
.end_put_char:
	MOV [put_char_ptr], C
    POP C
.return:
	SRET			; Return to user space

; This is the error message that will be shown
; in case an exception occurs
exc_msg:
	DB "Segment. Fault  (Core dumped)"
    DB 0

; This is the exception handler subroutine
exc:
	MOV B, 0
	MOV C, exc_msg
    MOV D, 0x02E0
.printk:
	MOVB AL, [C]	; Get character
	MOVB [D], AL	; Write to output
	INCB CL
	INCB DL
	CMPB BL, [C]	; Check if string terminator
	JNZ .printk		; Jump back to loop if not
	HLT

	ORG 0x200	; Following instructions
				; will be assembled at 0x200

ok_msg:
	DB "PIN OK"
    DB 0

nok_msg:
	DB "Wrong PIN"
    DB 0

; So the combination is... one, two, three,
; four, five? That's the stupidest
; combination I've ever heard in my life!
; That's the kind of thing an idiot
; would have on his luggage!
key:
	DB "12345"

task:			; The user task
	SUB SP, 5
   	MOV C, SP
    INC C
    CALL get_pin
    MOV A, 0
    MOV B, key
.cmp_loop:
	MOVB DL, [B]
    CMPB DL, [C]
    JNE .print_err
    INC A
    INC B
    INC C
    CMP A, 5
    JNE .cmp_loop
    MOV C, ok_msg
    JMP .print
.print_err:
	MOV C, nok_msg
.print:
	CALL print	; print it
	HLT

; Function that reads keys from
; the keypad until a '#' is pressed
; A similar C function could be like this:
;
; void get_pin(char * buffer) {
;     char c;
;     int i = 0;
;     while ((c = read_key()) != '#') {
;         buffer[i] = c;
;         i++;
;     }
; }
get_pin:
    PUSH A
    PUSH C
.loop:
	CALL read_key	; Reads a key
    CMPB AL, 0x23	; If key == '#'
    JNE .store
    POP C
    POP A
    RET
.store:
	MOVB [C], AL		; If key was pressed
    INC C
    JMP .loop

print:				; Print string
	PUSH A
    PUSH B
    PUSH C
    MOV B, 0
.loop2:
	MOVB BL, [C]	; Get character
	CALL put_char	; Calls put_char to print it
	INC C
    MOVB AL, [C]
	CMPB AL, 0		; Check if string terminator
	JNZ .loop2		; Jump back to loop if not
    POP C
    POP B
    POP A
    RET

read_key:		; User space wrapper
	MOV A, 0	; for read_key syscall
	SVC			; Syscall #0
	RET			; A -> syscall number

put_char:		; User space wrapper
	PUSH A		; for put_char syscall
	MOV A, 1	; Syscall #1
	SVC			; A -> syscall number
	POP A		; BL -> char to print
	RET
