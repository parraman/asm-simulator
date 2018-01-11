
16-bit Assembler Simulator
==========================

A web-based simulator of a 16-bit CPU. This project has been developed for
educational purposes and it is based on a `previous project
<https://github.com/Schweigi/assembler-simulator>` made by Marco Schweighauser.
The simulator has the following features:

* A 16-bit big-endian CPU.
* Two modes of operation: supervisor & user. Each mode of operation
  has its own SP register.
* 4 general purpose registers, which can be accessed in word or byte modes.
* 1024 bytes of memory.
* 16-bit input/output address map which can be accessed using IN/OUT instructions.
* An interrupt controller that supports up to 16 interrupt sources.
* A programmable 16-bit timer.
* Three input/output devices:
    * Visual display with a resolution of 16x16.
    * Textual display of 16 characters.
    * 10-keys numeric keypad.
* Inline memory editing.
* Execution breakpoints.

.. toctree::
    :maxdepth: 2
    :caption: User documentation

    getting-started
    memory
    processor 
    assembler
    instruction-set
    input-output
    interruptions
    system-calls

