; Example 5:
; The example defines two tasks:
; - A low-priority idle tasks that writes on the
;   visual display in a loop
; - A high-priority user task that blocks until a
;   key has been pressed and then writes the key
;   into the textual display

	JMP boot
	JMP isr
	JMP svc

bootStackTop EQU 0x19F  ; Kernel booting SP


; This is the array of PCBs. It is a static array.
; The equivalent C code for the PCB structure would be
; something like this:

; typedef struct pcb {
;     uint16_t PID; // Process ID
;     uint8_t state; // state (1 -> RUNNABLE, 0 -> BLOCKED)
;     uint8_t priority; // priority
;     uint16_t initial_ip; // Initial IP
;     uint16_t initial_usp; // Initial user stack
;     uint16_t current_kernel_sp; // Current kernel stack
; } pcb_t;

; pcb_t pcb_vector[2];
pcb_vector:
pcb_1:			; PCB of the IDLE task
	DW 1		; [+0] pcb_vector[0].PID = 1
	DB 1		; [+2] pcb_vector[0].state = RUNNABLE
	DB 0		; [+3] pcb_vector[0].priority = 0
	DW idle		; [+4] pcb_vector[0].initial_ip = idle
	DW 0x27F	; [+6] pcb_vector[0].initial_usp = 0x27F
	DW 0x1CD	; [+8] pcb_vector[0].current_kernel_sp = 0x1CD
pcb_2:			; PCB of User Task
	DW 2		; [+0] pcb_vector[1].PID = 2
	DB 1		; [+2] pcb_vector[1].state = RUNNABLE
	DB 1		; [+3] pcb_vector[1].priority = 1
	DW user_task	; [+4] pcb_vector[1].initial_ip = user_task
	DW 0x2DF	; [+6] pcb_vector[1].initial_usp = 0x2DF
	DW 0x1FD	; [+8] pcb_vector[1].current_kernel_sp = 0x1FD
pcb_vector_end:

; pcb_t * current_task = NULL;
current_task:	; Pointer to the PCB of the current
	DW 0		; task

boot:
	MOV SP, bootStackTop	; Set kernel booting SP = 0x19F
	CALL task_init			; Initialize the tasks
	MOV A, 1				; Set bit 0 of IRQMASK
	OUT 0					; Unmask keypad IRQ
	CALL schedule			; Call the first scheduling
	CALL initial_dispatch	; Initial dispatch
	HLT						; We are not supposed to come back

; task_init(): This method initializes the tasks so
; that, in their first context switch, their will
; start their execution from initial_switch()
task_init:
	MOV A, pcb_vector		; For all pcbs
	MOV B, pcb_vector_end	; in pcb_vector:
.loop_init:
	MOV C, [A+8]				; Set start_switch()
	MOV [C+1], initial_switch	; as the return address
	ADD A, 10
	CMP A, B
	JNE .loop_init
	RET

; pcb_t * schedule(): This method returns the PCB
; of the next task to be executed. In order to do so,
; it navigates through the pcb_vector array to
; return the first READY task with the highest
; priority
schedule:
	MOV A, pcb_vector
	MOV B, pcb_vector_end
	MOV D, A
.loop_schedule:
	ADD A, 10
	CMP A, B
	JE .end_schedule
	; A little trick here: it gets the whole
	; state + priority word. The number that
	; will be compared shall be:
	; number = (state << 8) + priority.
	; The READY tasks will have a higher number,
	; and then, from the READY tasks,
	; the higher the priority, the higher the number.
	; The only problem is that there MUST BE
	; ALWAYS at least ONE TASK READY (but that's
	; what the idle task is for, so... :)
	MOV C, [A+2]	; If the number is bigger, then
	CMP C, [D+2]	; the task will be selected
	JBE .loop_schedule
	MOV D, A
	JMP .loop_schedule
.end_schedule:
	MOV A, D		; It returns in A the pointer
	RET				; to the next task

; dispatch(): this is the dispatch function,
; the function that will perform the context
; switch. The trick here is that, in order to
; change the tasks, it only needs to change the
; value of the SP. When the function returns
; it will do so at the return address located
; at the top of the stack. This address will belong
; to the function from which dispatch() was called
; the last time the task left the CPU.
dispatch:
	CMP A, [current_task]	; It only switches
	JE .ret_dispatch		; if next != current
	MOV B, [current_task]
	MOV [B+8], SP			; Saves current SP
	MOV [current_task], A
	MOV SP, [A+8]			; Recovers next SP
.ret_dispatch:
	RET						; <- WHOOSHH!!

initial_dispatch:
	MOV [current_task], A
	MOV SP, [A+8]
	RET

; initial_switch(): prepares the supervisor stack
; frame so that the user task can be successfuly
; loaded by changing the CPU to user mode
initial_switch:
	MOV A, [current_task]
	PUSH 0x0010			; User Task SR: IRQMASK = 1
	PUSH [A+6]
	PUSH [A+4]
	MOV A, 0
	MOV B, 0
	MOV C, 0
	MOV D, 0
	SRET

; pcb_t * blocked_task = NULL;
; Pointer to the blocked task if any
blocked_task:
	DW 0

; Entry point for system calls. Only getchar() is
; defined
svc:
	CLI			; Disable IRQs, enabled back when SRETing
	CMP A, 0	; A = syscall number
	JNZ .not0	; 0 -> getchar
	CALL svc_getchar
.not0:
.return:
	SRET		; Return to user space

; svc_getchar(): getchar system call. This
; function will check if there is already a key
; in the input buffer. If there is, it will return it.
; If there is no letter, then the task will be
; blocked until a key is pressed.
svc_getchar:
	MOVB AL, [keypressed]
	CMPB AL, 1		; If keypressed ->
	JE .ret_svc_getchar	; return the key right away
	MOV A, [current_task]	; If not ->
	MOVB [A+2], 0		; current_task -> blocked
	MOV [blocked_task], A
	CALL schedule		; Schedule to select a
	CALL dispatch		; ready task and dispatch
.ret_svc_getchar:		; it
	MOV A, 0
	MOVB AL, [keyvalue]
	MOVB [keypressed], 0
	RET

keypressed:		; 1 = key pressed
	DB 0		; 0 = No key pressed

keyvalue:		; The buffer with the
	DB 0		; key pressed in ASCII

; uint16_t need_sched = 0;
; This variable will be used to indicate
; if the CPU was in supervisor mode when the IRQ was
; triggered.
need_sched:
	DW 0

isr:
	PUSH A
	PUSH B
	PUSH C
	PUSH D
	; Here we check if the CPU was in supervisor
	; mode when the IRQ was triggered. If it was
	; in supervisor mode, then THERE IS NO NEED
	; for scheduling, because the system call will
	; reschedule when it blocks the task. If it was
	; in user mode, then need_sched = 1, and
	; schedule before leaving the ISR.
	MOV [need_sched], 0
	MOV A, [SP+13]	; Check if we were in sup. mode
	AND A, 0x8000
	JNZ .isr_continue
	MOV [need_sched], 1 
.isr_continue:
	IN 6			; Store the ASCII in the buffer
	MOVB [keyvalue], AL
	MOVB AL, 1
	MOVB [keypressed], AL
	MOV A, 1
	OUT 2			; Write to signal IRQEOI
	MOV A, [blocked_task]	; If blocked_task != NULL
	CMP A, 0				; then blocked_task->state = READY
	JE .isr_end
	MOVB [A+2], 1
	MOV [blocked_task], 0
	MOV A, [need_sched]		; If need_sched == 1
	CMP A, 1				; then schedule, if not, IRET
	JNE .isr_end
	CALL schedule
	CALL dispatch
.isr_end:
	POP D
	POP C
	POP B
	POP A
	IRET

	ORG 0x200	; Following instructions
				; will be assembled at 0x200

; The idle task will print into the visual display
; in a loop
idle:
	MOV A, 0
	MOV B, 0x300
	MOV C, 0
.idle_loop:
	MOVB [B], AL
	INC B
	INC C
	CMP C, 10
	JNE .idle_check_loop
	MOV C, 0
	ADDB AL, 10
.idle_check_loop:
	CMP B, 0x400
	JNE .idle_loop
	MOV B, 0x300
	JMP .idle_loop

	ORG 0x280	; Following instructions
				; will be assembled at 0x280

; The user task will block until a key has been
; pressed
user_task:
	CALL getchar
	MOVB [0x2E0], AL
	JMP user_task

getchar:		; User space wrapper
	MOV A, 0	; for getchar syscall
	SVC			; Syscall #0
	RET			; A -> syscall number
