
export enum ExceptionType {

    DIVIDE_BY_ZERO = 0,
    INSTRUCTION_FETCH_ERROR = 1,
    MEMORY_ACCESS_ERROR = 2,
    UNKNOWN_OPCODE = 3,
    ILLEGAL_INSTRUCTION = 4,
    STACK_ACCESS_ERROR = 5

}

export class Exception {

    public message: string;
    public type: ExceptionType;
    public IP: number;
    public SP: number;
    public SR: number;
    public memoryAddress: number;

    constructor(type: ExceptionType, message: string, IP: number, SP: number, SR: number, memoryAddress?: number) {

        this.type = type;
        this.message = message;
        this.IP = IP;
        this.SP = SP;
        this.SR = SR;
        this.memoryAddress = memoryAddress;

    }

}
