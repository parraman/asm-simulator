
16-bit Assembler Simulator
==========================

A web-based simulator of a 16-bit CPU. This project has been developed for
educational purposes to support the teaching of the `Operating Systems course
<https://www.uah.es/en/estudios/estudios-oficiales/grados/asignatura/Operating-System-780007>`_
of the `Degree in Computer Engineering
<https://www.uah.es/en/estudios/estudios-oficiales/Degree-in-Computer-Engineering>`_
of the `University of Alcalá <https://www.uah.es/en>`_.

The simulator has the following features:

* A 16-bit big-endian CPU.
* Two modes of operation: supervisor & user. Each mode of operation 
  has its own SP register.
* 4 general purpose registers, which can be accessed in word or byte modes.
* 1024 bytes of memory.
* A Memory Protection Unit (MPU).
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

    assembler
    instruction-set
    directives

