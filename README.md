# 16-bit Assembler Simulator

A simulator of a 16-bit CPU. This project has been developed for educational
purposes and it is based on a [previous
project](https://github.com/Schweigi/assembler-simulator) made by Marco
Schweighauser. It project reuses the original page layout and the instruction
parsing mechanism, based on the use of regular expressions; and extends the
full instruction set with new instructions to handle byte-mode accesses and
interrupts and system calls. It has been written in Typescript using Angular 2+
and Bootstrap.

You can try it online [here](https://parraman.github.io/asm-simulator/)


## Features

- A 16-bit big-endian CPU.
- Two modes of operation: supervisor & user. Each mode of operation
  has its own SP register.
- 4 general purpose registers, which can be accessed in word or byte modes.
- 1024 bytes of memory.
- 16-bit input/output address map which can be accessed using IN/OUT instructions.
- An interrupt controller that supports up to 16 interrupt sources.
- A programmable 16-bit timer.
- Three input/output devices:
  - Visual display with a resolution of 16x16.
  - Textual display of 16 characters.
  - 10-keys numeric keypad.
- Inline memory editing.

## Simulator's architecture

The architectural description of the simulator comprises the following components:

###### Core components

- CPU (`CPUService`): simulates the Central Processing Unit.
- Memory (`MemoryService`): simulates the memory map. It allows the different
  input/output devices to map memory regions (e.g. framebuffers).
- I/O Registers Map (`IORegMapService`): simulates the input/output registers
  map. The different devices can use it to define different registers and map
  them.
- IRQ Controller (`IRQCtrlService`): simulates the interrupt controller.
- Timer (`TimerService`): implements the 16-bits timer.

###### Input/Output 

- Visual Display (`VisualDisplayComponent`): visual display of 16x16 pixels. It
  can be accessed through a framebuffer defined as a memory region.
- Keypad (`KeypadComponent`): a numeric keypad.
- Textual Display (`TextualDisplayComponent`): a 16 characters textual display.

###### View components

- CPU Registers View (`RegistersViewComponent`): component that displays the contents of the CPU registers.
- Memory view (`MemoryViewComponent`): component that visualizes the contents
  of the memory map. It also allows to edit the value of the cells inline.
- I/O Registers View (`IORegistersViewComponent`): component that displays the I/O registers map.

## License
**The MIT License**

Copyright (c) 2017 Pablo Parra

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
