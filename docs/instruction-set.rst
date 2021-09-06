Instruction Set
===============

This section covers the complete set of instructions that are included in the
simulator. Each instruction is identified by an *opcode* (operation code), a
mnemonic and the type of its parameters. An instruction can have zero, one or
two parameters. Two or more instructions of the same type can have the same
mnemonic (e.g. ``MOV``) but differ in their operation code, depending on the type
of the operands that are involved. Thus, an instruction is always coded in
memory as follows:

+-------------+------------+------------+
| *opcode*    | Operand 1  | Operand 2  |
+-------------+------------+------------+
| *mandatory* | *optional* | *optional* |
+-------------+------------+------------+

The size of the operation code is always of **8 bits**, while the size of the
operands can be **8 or 16 bits**, depending on their type.


Operand types
-------------

The type of operands or *addressing modes* supported by the simulator are the
following. The table includes the code name of the operand type and the size
of the instruction operand in memory.

+-------------------+------------------------------+---------+
| Operand type      | Description                  |  Size   |
+===================+==============================+=========+
| *BYTE*            | 8-bits immediate value       | 8 bits  |
+-------------------+------------------------------+---------+
| *WORD*            | 16-bits immediate value      | 16 bits |
+-------------------+------------------------------+---------+
| *ADDRESS*         | 16-bits address              | 16 bits |
+-------------------+------------------------------+---------+
| *REGISTER_8BITS*  | 8-bits register              | 8 bits  |
+-------------------+------------------------------+---------+
| *REGISTER_16BITS* | 16-bits register             | 8 bits  |
+-------------------+------------------------------+---------+
| *REGADDRESS*      | Register addressing + offset | 16 bits |
+-------------------+------------------------------+---------+

The semantics of the operand types are the following:

* 8-bits immediate value: an operand of this type will define an unsigned
  8-bits wide integer value.

* 16-bits immediate value: An operand of this type will define an unsigned
  16-bits wide integer value.

* 16-bits address: an operand of this type will define an 16-bits memory
  address.

* 8-bits register: this operand will codify the reference number or index of
  one of the 8-bits registers that are implemented by the CPU. All the index
  values are expressed in decimal format:

+---------------+-------------------+-------+
| Register Name | Description       | Index |
+===============+===================+=======+
| AH            | MSB of Register A | 9     |
+---------------+-------------------+-------+
| AL            | LSB of Register A | 10    |
+---------------+-------------------+-------+
| BH            | MSB of Register B | 11    |
+---------------+-------------------+-------+
| BL            | LSB of Register B | 12    |
+---------------+-------------------+-------+
| CH            | MSB of Register C | 13    |
+---------------+-------------------+-------+
| CL            | LSB of Register C | 14    |
+---------------+-------------------+-------+
| DH            | MSB of Register D | 15    |
+---------------+-------------------+-------+
| DL            | LSB of Register D | 16    |
+---------------+-------------------+-------+

* 16-bits register: this operand will codify the reference number or index of
  one of the 16-bits registers that are implemented by the CPU. All the index
  values are expressed in decimal format:

+---------------+----------------------------+-------+
| Register Name | Description                | Index |
+===============+============================+=======+
| A             | General Purpose Register A | 0     |
+---------------+----------------------------+-------+
| B             | General Purpose Register B | 1     |
+---------------+----------------------------+-------+
| C             | General Purpose Register C | 2     |
+---------------+----------------------------+-------+
| D             | General Purpose Register D | 3     |
+---------------+----------------------------+-------+
| SP            | Stack Pointer Register SP  | 4     |
+---------------+----------------------------+-------+

* Register addressing + offset: this operand will codify on 1 byte the
  reference number of one of the 16-bits registers and, on the another byte
  the offset added to the value stored on the given register. The offset is
  codified using two's complement [-128, 127]. 

Instructions description
------------------------

The assembler simulator supports the following instructions:

* :ref:`instruction-add`
* :ref:`instruction-addb`
* :ref:`instruction-and`
* :ref:`instruction-andb`
* :ref:`instruction-call`
* :ref:`instruction-cli`
* :ref:`instruction-cmp`
* :ref:`instruction-cmpb`
* :ref:`instruction-dec`
* :ref:`instruction-decb`
* :ref:`instruction-div`
* :ref:`instruction-divb`
* :ref:`instruction-hlt`
* :ref:`instruction-in`
* :ref:`instruction-inc`
* :ref:`instruction-incb`
* :ref:`instruction-iret`
* :ref:`instruction-ja`
* :ref:`instruction-jae`
* :ref:`instruction-jb`
* :ref:`instruction-jbe`
* :ref:`instruction-jc`
* :ref:`instruction-je`
* :ref:`instruction-jmp`
* :ref:`instruction-jna`
* :ref:`instruction-jnae`
* :ref:`instruction-jnb`
* :ref:`instruction-jnbe`
* :ref:`instruction-jnc`
* :ref:`instruction-jne`
* :ref:`instruction-jnz`
* :ref:`instruction-jz`
* :ref:`instruction-mov`
* :ref:`instruction-movb`
* :ref:`instruction-mul`
* :ref:`instruction-mulb`
* :ref:`instruction-not`
* :ref:`instruction-notb`
* :ref:`instruction-or`
* :ref:`instruction-orb`
* :ref:`instruction-out`
* :ref:`instruction-pop`
* :ref:`instruction-popb`
* :ref:`instruction-push`
* :ref:`instruction-pushb`
* :ref:`instruction-ret`
* :ref:`instruction-shl`
* :ref:`instruction-shlb`
* :ref:`instruction-shr`
* :ref:`instruction-shrb`
* :ref:`instruction-sret`
* :ref:`instruction-sti`
* :ref:`instruction-sub`
* :ref:`instruction-subb`
* :ref:`instruction-svc`
* :ref:`instruction-xor`
* :ref:`instruction-xorb`

.. _instruction-add:

ADD: 16-bits addition
^^^^^^^^^^^^^^^^^^^^^

Performs an addition of two 16-bits integers. Every form of the instruction
will have two operands. Operand 1 will always be a reference to a 16-bits
register. The integer contained by the register will be added to the value
referenced by Operand 2. The result will be stored in the register referenced
by Operand 1. 

The operation will modify the values of the carry (C) and zero
(Z) flags of the Status Register.

+-----------+-------------------+-------------------+---------------------+
| Opcode    | Operand 1         | Operand 2         | Example             |
+===========+===================+===================+=====================+
| 17 (0x11) | *REGISTER_16BITS* | *REGISTER_16BITS* | ``ADD A, B``        |
+-----------+-------------------+-------------------+---------------------+
| 18 (0x12) | *REGISTER_16BITS* | *REGADDRESS*      | ``ADD C, [A-100]``  |
+-----------+-------------------+-------------------+---------------------+
| 19 (0x13) | *REGISTER_16BITS* | *ADDRESS*         | ``ADD D, [0x1000]`` |
+-----------+-------------------+-------------------+---------------------+
| 20 (0x14) | *REGISTER_16BITS* | *WORD*            | ``ADD B, 12345``    |
+-----------+-------------------+-------------------+---------------------+

.. _instruction-addb:

ADDB: 8-bits addition
^^^^^^^^^^^^^^^^^^^^^

Performs an addition of two 8-bits integers. Every form of the instruction will
have two operands. Operand 1 will always be a reference to an 8-bits register.
The integer contained by the register will be added to the value referenced by
Operand 2. The result will be stored in the register referenced by Operand 1.

The operation will modify the values of the carry (C) and zero (Z) flags of the
Status Register.

+-----------+------------------+------------------+----------------------+
| Opcode    | Operand 1        | Operand 2        | Example              |
+===========+==================+==================+======================+
| 21 (0x15) | *REGISTER_8BITS* | *REGISTER_8BITS* | ``ADDB AH, BH``      |
+-----------+------------------+------------------+----------------------+
| 22 (0x16) | *REGISTER_8BITS* | *REGADDRESS*     | ``ADDB CL, [A-100]`` |
+-----------+------------------+------------------+----------------------+
| 23 (0x17) | *REGISTER_8BITS* | *ADDRESS*        | ``ADDB DH, [0x100]`` |
+-----------+------------------+------------------+----------------------+
| 24 (0x18) | *REGISTER_8BITS* | *BYTE*           | ``ADDB BL, 128``     |
+-----------+------------------+------------------+----------------------+

.. _instruction-and:

AND: 16-bits bitwise AND 
^^^^^^^^^^^^^^^^^^^^^^^^

Performs a `bitwise AND <https://en.wikipedia.org/wiki/Bitwise_operation#AND>`_
of two 16-bits integers. Every form of the instruction will have two operands.
Operand 1 will always be a reference to a 16-bits register. A logic AND will be
performed between the contents of the register and the value referenced by
Operand 2. The result will be stored in the register referenced by Operand 1. 

+-----------+-------------------+-------------------+---------------------+
| Opcode    | Operand 1         | Operand 2         | Example             |
+===========+===================+===================+=====================+
| 88 (0x58) | *REGISTER_16BITS* | *REGISTER_16BITS* | ``AND A, B``        |
+-----------+-------------------+-------------------+---------------------+
| 89 (0x59) | *REGISTER_16BITS* | *REGADDRESS*      | ``AND C, [A-100]``  |
+-----------+-------------------+-------------------+---------------------+
| 90 (0x5A) | *REGISTER_16BITS* | *ADDRESS*         | ``AND D, [0x1000]`` |
+-----------+-------------------+-------------------+---------------------+
| 91 (0x5B) | *REGISTER_16BITS* | *WORD*            | ``AND B, 0x00FF``   |
+-----------+-------------------+-------------------+---------------------+

.. _instruction-andb:

ANDB: 8-bits bitwise AND 
^^^^^^^^^^^^^^^^^^^^^^^^

Performs a `bitwise AND <https://en.wikipedia.org/wiki/Bitwise_operation#AND>`_
of two 8-bits integers. Every form of the instruction will have two operands.
Operand 1 will always be a reference to an 8-bits register. A logic AND will be
performed between the contents of the register and the value referenced by
Operand 2. The result will be stored in the register referenced by Operand 1.

+-----------+------------------+------------------+---------------------+
| Opcode    | Operand 1        | Operand 2        | Example             |
+===========+==================+==================+=====================+
| 92 (0x5C) | *REGISTER_8BITS* | *REGISTER_8BITS* | ``ANDB AH, BL``     |
+-----------+------------------+------------------+---------------------+
| 93 (0x5D) | *REGISTER_8BITS* | *REGADDRESS*     | ``ANDB CL, [A+30]`` |
+-----------+------------------+------------------+---------------------+
| 94 (0x5E) | *REGISTER_8BITS* | *ADDRESS*        | ``ANDB DH, [0x30]`` |
+-----------+------------------+------------------+---------------------+
| 95 (0x5F) | *REGISTER_8BITS* | *WORD*           | ``ANDB BL, 0x0F``   |
+-----------+------------------+------------------+---------------------+

.. _instruction-call:

CALL: call to subroutine
^^^^^^^^^^^^^^^^^^^^^^^^

Jumps to a subroutine that starts at the address referenced by Operand 1. The
instruction will push to the stack the return address, i.e. the address of
the instruction that follows the call.

+-----------+--------------+-----------+-----------------+
| Opcode    | Operand 1    | Operand 2 | Example         |
+===========+==============+===========+=================+
| 69 (0x45) | *REGADDRESS* | *NONE*    | ``CALL [B-20]`` |
+-----------+--------------+-----------+-----------------+
| 70 (0x46) | *WORD*       | *NONE*    | ``CALL 0x1000`` |
+-----------+--------------+-----------+-----------------+

.. _instruction-cli:

CLI: clear interrupt mask 
^^^^^^^^^^^^^^^^^^^^^^^^^

Clears the Interrupt Mask Bit of the Status Register. When the register is
cleared, the CPU interrupts are masked and, thus, disabled. The instruction has
no operands. This is a priviledged instruction that can only be called when in
Supervisor mode. 

+------------+-----------+-----------+---------+
| Opcode     | Operand 1 | Operand 2 | Example |
+============+===========+===========+=========+
| 130 (0x82) | *NONE*    | *NONE*    | ``CLI`` |
+------------+-----------+-----------+---------+

.. _instruction-cmp:

CMP: 16-bits integer comparison 
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Compares two 16-bits integers. Every form of the instruction will have two
operands. Operand 1 will always be a reference to a 16-bits register. The
comparison will be done by substracting the value referenced by the second
operand to the value contained by the register referenced by Operand 1. The
result of the substraction will not be stored, but the **carry** (C) and
**zero** (Z) flags of the Status Register will be modified as follows:

* Operand 1 == Operand 2 => C = 0, Z = 1
* Operand 1 > Operand 2 => C = 0, Z = 0
* Operand 1 < Operand 2 => C = 1, Z = 0

+-----------+-------------------+-------------------+---------------------+
| Opcode    | Operand 1         | Operand 2         | Example             |
+===========+===================+===================+=====================+
| 37 (0x25) | *REGISTER_16BITS* | *REGISTER_16BITS* | ``CMP A, B``        |
+-----------+-------------------+-------------------+---------------------+
| 38 (0x26) | *REGISTER_16BITS* | *REGADDRESS*      | ``CMP C, [A-100]``  |
+-----------+-------------------+-------------------+---------------------+
| 39 (0x27) | *REGISTER_16BITS* | *ADDRESS*         | ``CMP D, [0x1000]`` |
+-----------+-------------------+-------------------+---------------------+
| 40 (0x28) | *REGISTER_16BITS* | *WORD*            | ``CMP B, 12345``    |
+-----------+-------------------+-------------------+---------------------+

.. _instruction-cmpb:

CMPB: 8-bits integer comparison 
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Compares two 8-bits integers. Every form of the instruction will have two
operands. Operand 1 will always be a reference to an 8-bits register. The
comparison will be done by substracting the value referenced by the second
operand to the value contained by the register referenced by Operand 1. The
result of the substraction will not be stored, but the **carry** (C) and
**zero** (Z) flags of the Status Register will be modified as follows:

* Operand 1 == Operand 2 => C = 0, Z = 1
* Operand 1 > Operand 2 => C = 0, Z = 0
* Operand 1 < Operand 2 => C = 1, Z = 0

+-----------+------------------+------------------+---------------------+
| Opcode    | Operand 1        | Operand 2        | Example             |
+===========+==================+==================+=====================+
| 41 (0x29) | *REGISTER_8BITS* | *REGISTER_8BITS* | ``CMPB CH, CL``     |
+-----------+------------------+------------------+---------------------+
| 42 (0x2A) | *REGISTER_8BITS* | *REGADDRESS*     | ``CMPB DL, [A-2]``  |
+-----------+------------------+------------------+---------------------+
| 43 (0x2B) | *REGISTER_8BITS* | *ADDRESS*        | ``CMPB BH, [0x20]`` |
+-----------+------------------+------------------+---------------------+
| 44 (0x2C) | *REGISTER_8BITS* | *BYTE*           | ``CMPB CH, 0x4``    |
+-----------+------------------+------------------+---------------------+

.. _instruction-dec:

DEC: decrement 16-bits register 
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Decrements the value of a 16-bits register by 1 unit. The result will be
stored in the same register. The operation will modify the values of the
**carry** (C) and **zero** (Z) flags of the Status Register. 

+-----------+-------------------+-----------+-----------+
| Opcode    | Operand 1         | Operand 2 | Example   |
+===========+===================+===========+===========+
| 35 (0x23) | *REGISTER_16BITS* | *NONE*    | ``DEC B`` |
+-----------+-------------------+-----------+-----------+

.. _instruction-decb:

DECB: decrement 8-bits register 
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Decrements the value of an 8-bits register by 1 unit. The result will be
stored in the same register. The operation will modify the values of the
**carry** (C) and **zero** (Z) flags of the Status Register. 

+-----------+-------------------+-----------+-------------+
| Opcode    | Operand 1         | Operand 2 | Example     |
+===========+===================+===========+=============+
| 36 (0x24) | *REGISTER_16BITS* | *NONE*    | ``DECB BL`` |
+-----------+-------------------+-----------+-------------+

.. _instruction-div:

DIV: 16-bits division 
^^^^^^^^^^^^^^^^^^^^^

Divides the value stored in Register A by the 16-bits value referred to by
Operand 1. The result will be stored into Register A. The operation will
modify the values of the **carry** (C) and **zero** (Z) flags of the Status
Register. If the instruction executes a divison-by-zero, an exception will be triggered.

+-----------+-------------------+-----------+------------------+
| Opcode    | Operand 1         | Operand 2 | Example          |
+===========+===================+===========+==================+
| 80 (0x50) | *REGISTER_16BITS* | *NONE*    | ``DIV B``        |
+-----------+-------------------+-----------+------------------+
| 81 (0x51) | *REGADDRESS*      | *NONE*    | ``DIV [A+100]``  |
+-----------+-------------------+-----------+------------------+
| 82 (0x52) | *ADDRESS*         | *NONE*    | ``DIV [0x1000]`` |
+-----------+-------------------+-----------+------------------+
| 83 (0x53) | *WORD*            | *NONE*    | ``DIV 0x2``      |
+-----------+-------------------+-----------+------------------+

.. _instruction-divb:

DIVB: 8-bits division 
^^^^^^^^^^^^^^^^^^^^^

Divides the value stored in Register AL by the 8-bits value referred to by
Operand 1. The result will be stored into Register AL. The operation will
modify the values of the **carry** (C) and **zero** (Z) flags of the Status
Register. If the instruction executes a divison-by-zero, an exception will be
triggered.

+-----------+------------------+-----------+------------------+
| Opcode    | Operand 1        | Operand 2 | Example          |
+===========+==================+===========+==================+
| 84 (0x54) | *REGISTER_8BITS* | *NONE*    | ``DIVB BL``      |
+-----------+------------------+-----------+------------------+
| 85 (0x55) | *REGADDRESS*     | *NONE*    | ``DIVB [A+100]`` |
+-----------+------------------+-----------+------------------+
| 86 (0x56) | *ADDRESS*        | *NONE*    | ``DIVB [0x100]`` |
+-----------+------------------+-----------+------------------+
| 87 (0x57) | *BYTE*           | *NONE*    | ``DIVB 0x2``     |
+-----------+------------------+-----------+------------------+

.. _instruction-hlt:

HLT: halt processor 
^^^^^^^^^^^^^^^^^^^

Sets the CPU in halt mode. The **halt** (H) flag of the Status Register will
be set and the processor will be stopped from executing further instructions.
Interrupts can occur if they are properly enabled. If an interrupt occurs,
the CPU will abandon halt mode (**halt** flag will be cleared) and the
execution will resume from the instruction service routine.

+---------+-----------+-----------+---------+
| Opcode  | Operand 1 | Operand 2 | Example |
+=========+===========+===========+=========+
| 0 (0x0) | *NONE*    | *NONE*    | ``HLT`` |
+---------+-----------+-----------+---------+

.. _instruction-in:

IN: read input/output register 
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Reads the value of an input/output register. The address of the register to be
read is obtained from the value of Operand 1. The result will be stored into
Register A. This is a priviledged instruction that can only be called when in
Supervisor mode.

+------------+-------------------+-----------+-----------------+
| Opcode     | Operand 1         | Operand 2 | Example         |
+============+===================+===========+=================+
| 135 (0x87) | *REGISTER_16BITS* | *NONE*    | ``IN B``        |
+------------+-------------------+-----------+-----------------+
| 136 (0x88) | *REGADDRESS*      | *NONE*    | ``IN [A+100]``  |
+------------+-------------------+-----------+-----------------+
| 137 (0x89) | *ADDRESS*         | *NONE*    | ``IN [0x1000]`` |
+------------+-------------------+-----------+-----------------+
| 138 (0x8A) | *WORD*            | *NONE*    | ``IN 0x2``      |
+------------+-------------------+-----------+-----------------+

.. _instruction-inc:

INC: increment 16-bits register 
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Increments the value of a 16-bits register by 1 unit. The result will be
stored in the same register. The operation will modify the values of the
**carry** (C) and **zero** (Z) flags of the Status Register. 

+-----------+-------------------+-----------+-----------+
| Opcode    | Operand 1         | Operand 2 | Example   |
+===========+===================+===========+===========+
| 33 (0x21) | *REGISTER_16BITS* | *NONE*    | ``INC C`` |
+-----------+-------------------+-----------+-----------+

.. _instruction-incb:

INCB: increment 8-bits register 
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Increments the value of an 8-bits register by 1 unit. The result will be stored
in the same register. The operation will modify the values of the **carry** (C)
and **zero** (Z) flags of the Status Register. 

+-----------+-------------------+-----------+-------------+
| Opcode    | Operand 1         | Operand 2 | Example     |
+===========+===================+===========+=============+
| 34 (0x22) | *REGISTER_16BITS* | *NONE*    | ``INCB DL`` |
+-----------+-------------------+-----------+-------------+

.. _instruction-iret:

IRET: return from ISR
^^^^^^^^^^^^^^^^^^^^^

Returns from an Interrupt Service Routiner (ISR). The execution of this
instruction will recover the Instruction Pointer (IP), the Stack Pointer (SP)
and the Status Register stored in the stack and jump to the IP address.

+------------+-----------+-----------+----------+
| Opcode     | Operand 1 | Operand 2 | Example  |
+============+===========+===========+==========+
| 132 (0x84) | *NONE*    | *NONE*    | ``IRET`` |
+------------+-----------+-----------+----------+

.. _instruction-ja:

JA: jump if above
^^^^^^^^^^^^^^^^^

Jumps to a given address if the **carry** (C) and **zero** (Z) flags of the
Status Register are zero (see :ref:`instruction-cmp`). If the condition is met,
the CPU will resume its execution from the address referenced by Operand 1.
Otherwise, it will continue with the next instruction. The instruction has one
mnemonic alias: ``JNBE``.

+-----------+--------------+-----------+---------------+
| Opcode    | Operand 1    | Operand 2 | Example       |
+===========+==============+===========+===============+
| 55 (0x37) | *REGADDRESS* | *NONE*    | ``JA [C+20]`` |
+-----------+--------------+-----------+---------------+
| 56 (0x38) | *WORD*       | *NONE*    | ``JA 0x1000`` |
+-----------+--------------+-----------+---------------+

.. _instruction-jae:

JAE: jump if above or equal
^^^^^^^^^^^^^^^^^^^^^^^^^^^

See :ref:`instruction-jnc`.

.. _instruction-jb:

JB: jump if below 
^^^^^^^^^^^^^^^^^

See :ref:`instruction-jc`.

.. _instruction-jbe:

JBE: jump if below or equal
^^^^^^^^^^^^^^^^^^^^^^^^^^^

See :ref:`instruction-jna`.

.. _instruction-jc:

JC: jump if carry set 
^^^^^^^^^^^^^^^^^^^^^

Jumps to a given address if the **carry** (C) flag of the Status Register is
set (see :ref:`instruction-cmp`). If the condition is met, the CPU will resume
its execution from the address referenced by Operand 1. Otherwise, it will
continue with the next instruction. The instruction has two mnemonic aliases:
``JBE`` and ``JNAE``.

+-----------+--------------+-----------+---------------+
| Opcode    | Operand 1    | Operand 2 | Example       |
+===========+==============+===========+===============+
| 47 (0x2F) | *REGADDRESS* | *NONE*    | ``JC [C+50]`` |
+-----------+--------------+-----------+---------------+
| 48 (0x30) | *WORD*       | *NONE*    | ``JC 0x2000`` |
+-----------+--------------+-----------+---------------+

.. _instruction-je:

JE: jump if equal
^^^^^^^^^^^^^^^^^

See :ref:`instruction-jz`.

.. _instruction-jmp:

JMP: jump to address
^^^^^^^^^^^^^^^^^^^^

Inconditionally jumps to a given address. The CPU will resume its execution
from the address referenced by Operand 1. 

+-----------+--------------+-----------+----------------+
| Opcode    | Operand 1    | Operand 2 | Example        |
+===========+==============+===========+================+
| 45 (0x2D) | *REGADDRESS* | *NONE*    | ``JMP [A+24]`` |
+-----------+--------------+-----------+----------------+
| 46 (0x2E) | *WORD*       | *NONE*    | ``JMP 0x1200`` |
+-----------+--------------+-----------+----------------+


.. _instruction-jna:

JNA: jump if not above
^^^^^^^^^^^^^^^^^^^^^^

Jumps to a given address if the **carry** (C) or **zero** (Z) flags of the
Status Register are set (see :ref:`instruction-cmp`). If the condition is met,
the CPU will resume its execution from the address referenced by Operand 1.
Otherwise, it will continue with the next instruction. The instruction has one
mnemonic alias: ``JBE``.


+-----------+--------------+-----------+----------------+
| Opcode    | Operand 1    | Operand 2 | Example        |
+===========+==============+===========+================+
| 57 (0x39) | *REGADDRESS* | *NONE*    | ``JNA [C+20]`` |
+-----------+--------------+-----------+----------------+
| 58 (0x3A) | *WORD*       | *NONE*    | ``JNA 0x1000`` |
+-----------+--------------+-----------+----------------+

.. _instruction-jnae:

JNAE: jump if not above or equal 
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

See :ref:`instruction-jc`.

.. _instruction-jnb:

JNB: jump if not below 
^^^^^^^^^^^^^^^^^^^^^^

See :ref:`instruction-jnc`.

.. _instruction-jnbe:

JNBE: jump if not below or equal
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

See :ref:`instruction-jnbe`.

.. _instruction-jnc:

JNC: jump if not carry set 
^^^^^^^^^^^^^^^^^^^^^^^^^^

Jumps to a given address if the **carry** (C) flag of the Status Register is
zero (see :ref:`instruction-cmp`). If the condition is met, the CPU will resume
its execution from the address referenced by Operand 1. Otherwise, it will
continue with the next instruction. The instruction has two mnemonic aliases:
``JNB`` and ``JAE``.

+-----------+--------------+-----------+----------------+
| Opcode    | Operand 1    | Operand 2 | Example        |
+===========+==============+===========+================+
| 49 (0x31) | *REGADDRESS* | *NONE*    | ``JNC [C+2]``  |
+-----------+--------------+-----------+----------------+
| 50 (0x32) | *WORD*       | *NONE*    | ``JNC 0x4000`` |
+-----------+--------------+-----------+----------------+

.. _instruction-jne:

JNE: jump if not equal
^^^^^^^^^^^^^^^^^^^^^^

See :ref:`instruction-jnz`.

.. _instruction-jnz:

JNZ: jump if not zero 
^^^^^^^^^^^^^^^^^^^^^

Jumps to a given address if the **zero** (Z) flag of the Status Register is set
(see :ref:`instruction-cmp`). If the condition is met, the CPU will resume its
execution from the address referenced by Operand 1. Otherwise, it will
continue with the next instruction. The instruction has one mnemonic alias:
``JNE``.

+-----------+--------------+-----------+----------------+
| Opcode    | Operand 1    | Operand 2 | Example        |
+===========+==============+===========+================+
| 53 (0x35) | *REGADDRESS* | *NONE*    | ``JNZ [A+2]``  |
+-----------+--------------+-----------+----------------+
| 54 (0x36) | *WORD*       | *NONE*    | ``JNZ 0x1000`` |
+-----------+--------------+-----------+----------------+

.. _instruction-jz:

JZ: jump if zero 
^^^^^^^^^^^^^^^^

Jumps to a given address if the **zero** (Z) flag of the Status Register is zero 
(see :ref:`instruction-cmp`). If the condition is met, the CPU will resume its
execution from the address referenced by Operand 1. Otherwise, it will
continue with the next instruction. The instruction has one mnemonic alias:
``JE``.

+-----------+--------------+-----------+---------------+
| Opcode    | Operand 1    | Operand 2 | Example       |
+===========+==============+===========+===============+
| 51 (0x33) | *REGADDRESS* | *NONE*    | ``JZ [A+20]`` |
+-----------+--------------+-----------+---------------+
| 52 (0x34) | *WORD*       | *NONE*    | ``JZ 0x1000`` |
+-----------+--------------+-----------+---------------+

.. _instruction-mov:

MOV: 16-bits copy 
^^^^^^^^^^^^^^^^^

Copies a 16-bits value, referenced by Operand 2, to the location referred to by
Operand 1. 

+----------+-------------------+-------------------+---------------------+
| Opcode   | Operand 1         | Operand 2         | Example             |
+==========+===================+===================+=====================+
| 1 (0x01) | *REGISTER_16BITS* | *REGISTER_16BITS* | ``MOV A, B``        |
+----------+-------------------+-------------------+---------------------+
| 2 (0x02) | *REGISTER_16BITS* | *REGADDRESS*      | ``MOV C, [A-100]``  |
+----------+-------------------+-------------------+---------------------+
| 3 (0x03) | *REGISTER_16BITS* | *ADDRESS*         | ``MOV D, [0x1000]`` |
+----------+-------------------+-------------------+---------------------+
| 4 (0x04) | *REGADDRESS*      | *REGISTER_16BITS* | ``MOV [B-2], A``    |
+----------+-------------------+-------------------+---------------------+
| 5 (0x05) | *ADDRESS*         | *REGISTER_16BITS* | ``MOV [0x100], D``  |
+----------+-------------------+-------------------+---------------------+
| 6 (0x06) | *REGISTER_16BITS* | *WORD*            | ``MOV A, 0x100``    |
+----------+-------------------+-------------------+---------------------+
| 7 (0x07) | *REGADDRESS*      | *WORD*            | ``MOV [D-4], B``    |
+----------+-------------------+-------------------+---------------------+
| 8 (0x08) | *ADDRESS*         | *WORD*            | ``MOV [0x200], C``  |
+----------+-------------------+-------------------+---------------------+

.. _instruction-movb:

MOVB: 8-bits copy 
^^^^^^^^^^^^^^^^^

Copies an 8-bits value, referenced by Operand 2, to the location referred to by
Operand 1. 

+-----------+------------------+------------------+-----------------------+
| Opcode    | Operand 1        | Operand 2        | Example               |
+===========+==================+==================+=======================+
| 9 (0x09)  | *REGISTER_8BITS* | *REGISTER_8BITS* | ``MOVB AH, BL``       |
+-----------+------------------+------------------+-----------------------+
| 10 (0x0A) | *REGISTER_8BITS* | *REGADDRESS*     | ``MOVB BL, [A-100]``  |
+-----------+------------------+------------------+-----------------------+
| 11 (0x0B) | *REGISTER_8BITS* | *ADDRESS*        | ``MOVB DH, [0x1000]`` |
+-----------+------------------+------------------+-----------------------+
| 12 (0x0C) | *REGADDRESS*     | *REGISTER_8BITS* | ``MOVB [B-2], AH``    |
+-----------+------------------+------------------+-----------------------+
| 13 (0x0D) | *ADDRESS*        | *REGISTER_8BITS* | ``MOVB [0x100], CL``  |
+-----------+------------------+------------------+-----------------------+
| 14 (0x0E) | *REGISTER_8BITS* | *BYTE*           | ``MOVB AL, 0x80``     |
+-----------+------------------+------------------+-----------------------+
| 15 (0x0F) | *REGADDRESS*     | *BYTE*           | ``MOVB [D-4], AL``    |
+-----------+------------------+------------------+-----------------------+
| 16 (0x10) | *ADDRESS*        | *BYTE*           | ``MOVB [0x200], CH``  |
+-----------+------------------+------------------+-----------------------+

.. _instruction-mul:

MUL: 16-bits multiplication 
^^^^^^^^^^^^^^^^^^^^^^^^^^^

Multiplies the value stored in Register A by the 16-bits value referred to by
Operand 1. The result will be stored into Register A. The operation will
modify the values of the **carry** (C) and **zero** (Z) flags of the Status
Register. 

+-----------+-------------------+-----------+------------------+
| Opcode    | Operand 1         | Operand 2 | Example          |
+===========+===================+===========+==================+
| 72 (0x48) | *REGISTER_16BITS* | *NONE*    | ``MUL A``        |
+-----------+-------------------+-----------+------------------+
| 73 (0x49) | *REGADDRESS*      | *NONE*    | ``MUL [A+100]``  |
+-----------+-------------------+-----------+------------------+
| 74 (0x4A) | *ADDRESS*         | *NONE*    | ``MUL [0x2000]`` |
+-----------+-------------------+-----------+------------------+
| 75 (0x4B) | *WORD*            | *NONE*    | ``MUL 0x4``      |
+-----------+-------------------+-----------+------------------+

.. _instruction-mulb:

MULB: 8-bits multiplication
^^^^^^^^^^^^^^^^^^^^^^^^^^^

Multiplies the value stored in Register AL by the 8-bits value referred to by
Operand 1. The result will be stored into Register AL. The operation will
modify the values of the **carry** (C) and **zero** (Z) flags of the Status
Register. 

+-----------+------------------+-----------+------------------+
| Opcode    | Operand 1        | Operand 2 | Example          |
+===========+==================+===========+==================+
| 76 (0x4C) | *REGISTER_8BITS* | *NONE*    | ``MULB CL``      |
+-----------+------------------+-----------+------------------+
| 77 (0x4D) | *REGADDRESS*     | *NONE*    | ``MULB [A+100]`` |
+-----------+------------------+-----------+------------------+
| 78 (0x4E) | *ADDRESS*        | *NONE*    | ``MULB [0x400]`` |
+-----------+------------------+-----------+------------------+
| 79 (0x4F) | *BYTE*           | *NONE*    | ``MULB 0x8``     |
+-----------+------------------+-----------+------------------+

.. _instruction-not:

NOT: 16-bits bitwise NOT
^^^^^^^^^^^^^^^^^^^^^^^^

Performs a `bitwise NOT <https://en.wikipedia.org/wiki/Bitwise_operation#NOT>`_
on the bits of a 16-bits register, referenced by Operand 1. The result of the
operation will be stored in the same register. 

+------------+-------------------+-----------+-----------+
| Opcode     | Operand 1         | Operand 2 | Example   |
+============+===================+===========+===========+
| 112 (0x70) | *REGISTER_16BITS* | *NONE*    | ``NOT A`` |
+------------+-------------------+-----------+-----------+

.. _instruction-notb:

NOTB: 8-bits bitwise NOT
^^^^^^^^^^^^^^^^^^^^^^^^

Performs a `bitwise NOT <https://en.wikipedia.org/wiki/Bitwise_operation#NOT>`_
on the bits of an 8-bits register, referenced by Operand 1. The result of the
operation will be stored in the same register. 

+------------+------------------+-----------+-------------+
| Opcode     | Operand 1        | Operand 2 | Example     |
+============+==================+===========+=============+
| 113 (0x71) | *REGISTER_8BITS* | *NONE*    | ``NOTB AL`` |
+------------+------------------+-----------+-------------+

.. _instruction-or:

OR: 16-bits bitwise OR 
^^^^^^^^^^^^^^^^^^^^^^

Performs a `bitwise OR <https://en.wikipedia.org/wiki/Bitwise_operation#OR>`_
of two 16-bits integers. Every form of the instruction will have two
operands. Operand 1 will always be a reference to a 16-bits register. A logic
OR will be performed between the contents of the register and the value
referenced by Operand 2. The result will be stored in the register referenced
by Operand 1. 

+-----------+-------------------+-------------------+--------------------+
| Opcode    | Operand 1         | Operand 2         | Example            |
+===========+===================+===================+====================+
| 96 (0x60) | *REGISTER_16BITS* | *REGISTER_16BITS* | ``OR C, B``        |
+-----------+-------------------+-------------------+--------------------+
| 97 (0x61) | *REGISTER_16BITS* | *REGADDRESS*      | ``OR C, [B-100]``  |
+-----------+-------------------+-------------------+--------------------+
| 98 (0x62) | *REGISTER_16BITS* | *ADDRESS*         | ``OR D, [0x1000]`` |
+-----------+-------------------+-------------------+--------------------+
| 99 (0x63) | *REGISTER_16BITS* | *WORD*            | ``OR D, 0xA5A5``   |
+-----------+-------------------+-------------------+--------------------+

.. _instruction-orb:

ORB: 8-bits bitwise OR 
^^^^^^^^^^^^^^^^^^^^^^

Performs a `bitwise OR <https://en.wikipedia.org/wiki/Bitwise_operation#OR>`_
of two 8-bits integers. Every form of the instruction will have two operands.
Operand 1 will always be a reference to an 8-bits register. A logic OR will be
performed between the contents of the register and the value referenced by
Operand 2. The result will be stored in the register referenced by Operand 1.

+------------+------------------+------------------+--------------------+
| Opcode     | Operand 1        | Operand 2        | Example            |
+============+==================+==================+====================+
| 100 (0x64) | *REGISTER_8BITS* | *REGISTER_8BITS* | ``ORB CH, BL``     |
+------------+------------------+------------------+--------------------+
| 101 (0x65) | *REGISTER_8BITS* | *REGADDRESS*     | ``ORB DL, [A+30]`` |
+------------+------------------+------------------+--------------------+
| 102 (0x66) | *REGISTER_8BITS* | *ADDRESS*        | ``ORB CH, [0x30]`` |
+------------+------------------+------------------+--------------------+
| 103 (0x67) | *REGISTER_8BITS* | *WORD*           | ``ORB BL, 0xA5``   |
+------------+------------------+------------------+--------------------+

.. _instruction-out:

OUT: write input/output register 
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Writes the contents of General Purpose Register A into an input/output
register. The address of the register to be written is obtained from the value
of Operand 1. This is a priviledged instruction that can only be called when in
Supervisor mode.

+------------+-------------------+-----------+------------------+
| Opcode     | Operand 1         | Operand 2 | Example          |
+============+===================+===========+==================+
| 139 (0x8B) | *REGISTER_16BITS* | *NONE*    | ``OUT C``        |
+------------+-------------------+-----------+------------------+
| 140 (0x8C) | *REGADDRESS*      | *NONE*    | ``OUT [B+100]``  |
+------------+-------------------+-----------+------------------+
| 141 (0x8D) | *ADDRESS*         | *NONE*    | ``OUT [0x1000]`` |
+------------+-------------------+-----------+------------------+
| 142 (0x8E) | *WORD*            | *NONE*    | ``OUT 0x2``      |
+------------+-------------------+-----------+------------------+

.. _instruction-pop:

POP: pop 16-bits from stack
^^^^^^^^^^^^^^^^^^^^^^^^^^^

Pops a 16-bits value from the top of the stack and stores it into the 16-bits
register referenced by Operand 1. The instruction will update the Stack Pointer
(SP), increasing it by 2 units.

+-----------+-------------------+-----------+-----------+
| Opcode    | Operand 1         | Operand 2 | Example   |
+===========+===================+===========+===========+
| 67 (0x43) | *REGISTER_16BITS* | *NONE*    | ``POP A`` |
+-----------+-------------------+-----------+-----------+

.. _instruction-popb:

POPB: pop 8-bits from stack
^^^^^^^^^^^^^^^^^^^^^^^^^^^

Pops an 8-bits value from the top of the stack and stores it into the 8-bits
register referenced by Operand 1. The instruction will update the Stack Pointer
(SP), increasing it by 1 unit.

+-----------+------------------+-----------+-------------+
| Opcode    | Operand 1        | Operand 2 | Example     |
+===========+==================+===========+=============+
| 68 (0x44) | *REGISTER_8BITS* | *NONE*    | ``POPB AL`` |
+-----------+------------------+-----------+-------------+

.. _instruction-push:

PUSH: push 16-bits to stack
^^^^^^^^^^^^^^^^^^^^^^^^^^^

Pushes a 16-bits value, referenced by Operand 1, to the top of the stack. The
instruction will update the Stack Pointer (SP), decreasing it by 2 units.

+-----------+-------------------+-----------+-------------------+
| Opcode    | Operand 1         | Operand 2 | Example           |
+===========+===================+===========+===================+
| 59 (0x3B) | *REGISTER_16BITS* | *NONE*    | ``PUSH C``        |
+-----------+-------------------+-----------+-------------------+
| 60 (0x3C) | *REGADDRESS*      | *NONE*    | ``PUSH [B+100]``  |
+-----------+-------------------+-----------+-------------------+
| 61 (0x3D) | *ADDRESS*         | *NONE*    | ``PUSH [0x1000]`` |
+-----------+-------------------+-----------+-------------------+
| 62 (0x3E) | *WORD*            | *NONE*    | ``PUSH 0x2``      |
+-----------+-------------------+-----------+-------------------+

.. _instruction-pushb:

PUSHB: push 8-bits to stack
^^^^^^^^^^^^^^^^^^^^^^^^^^^

Pushes an 8-bits value, referenced by Operand 1, to the top of the stack. The
instruction will update the Stack Pointer (SP), decreasing it by 1 units.

+-----------+-------------------+-----------+-------------------+
| Opcode    | Operand 1         | Operand 2 | Example           |
+===========+===================+===========+===================+
| 63 (0x3F) | *REGISTER_16BITS* | *NONE*    | ``PUSHB CL``      |
+-----------+-------------------+-----------+-------------------+
| 64 (0x40) | *REGADDRESS*      | *NONE*    | ``PUSHB [B+100]`` |
+-----------+-------------------+-----------+-------------------+
| 65 (0x41) | *ADDRESS*         | *NONE*    | ``PUSHB [0x400]`` |
+-----------+-------------------+-----------+-------------------+
| 66 (0x42) | *WORD*            | *NONE*    | ``PUSHB 0x80``    |
+-----------+-------------------+-----------+-------------------+

.. _instruction-ret:

RET: return from subroutine
^^^^^^^^^^^^^^^^^^^^^^^^^^^

Returns from a subroutine. The execution of this instruction will pop the
Instruction Pointer (IP) stored in the stack and jump to the IP address. The
instruction will update the Stack Pointer (SP).

+-----------+-----------+-----------+---------+
| Opcode    | Operand 1 | Operand 2 | Example |
+===========+===========+===========+=========+
| 71 (0x47) | *NONE*    | *NONE*    | ``RET`` |
+-----------+-----------+-----------+---------+

.. _instruction-shl:

SHL: 16-bits logical left shift
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Performs a `logical left shift <https://en.wikipedia.org/wiki/Logical_shift>`_
of the value of a 16-bits register. Every form of the instruction will have two
operands.  Operand 1 will always be a reference to a 16-bits register. Operand
2 will indicate the number of bit positions that the value shall be shifted.
The result will be stored in the register referenced by Operand 1. 

The operation will modify the values of the carry (C) and zero (Z) flags of the Status Register.

+------------+-------------------+-------------------+---------------------+
| Opcode     | Operand 1         | Operand 2         | Example             |
+============+===================+===================+=====================+
| 114 (0x72) | *REGISTER_16BITS* | *REGISTER_16BITS* | ``SHL A, B``        |
+------------+-------------------+-------------------+---------------------+
| 115 (0x73) | *REGISTER_16BITS* | *REGADDRESS*      | ``SHL C, [A-100]``  |
+------------+-------------------+-------------------+---------------------+
| 116 (0x74) | *REGISTER_16BITS* | *ADDRESS*         | ``SHL D, [0x1000]`` |
+------------+-------------------+-------------------+---------------------+
| 117 (0x75) | *REGISTER_16BITS* | *WORD*            | ``SHL B, 4``        |
+------------+-------------------+-------------------+---------------------+

.. _instruction-shlb:

SHLB: 8-bits logical left shift
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Performs a `logical left shift <https://en.wikipedia.org/wiki/Logical_shift>`_
of the value of an 8-bits register. Every form of the instruction will have two
operands.  Operand 1 will always be a reference to an 8-bits register. Operand
2 will indicate the number of bit positions that the value shall be shifted.
The result will be stored in the register referenced by Operand 1. 

The operation will modify the values of the carry (C) and zero (Z) flags of the Status Register.

+------------+------------------+------------------+---------------------+
| Opcode     | Operand 1        | Operand 2        | Example             |
+============+==================+==================+=====================+
| 118 (0x76) | *REGISTER_8BITS* | *REGISTER_8BITS* | ``SHLB AH, BL``     |
+------------+------------------+------------------+---------------------+
| 119 (0x77) | *REGISTER_8BITS* | *REGADDRESS*     | ``SHLB CL, [A+30]`` |
+------------+------------------+------------------+---------------------+
| 120 (0x78) | *REGISTER_8BITS* | *ADDRESS*        | ``SHLB DH, [0x30]`` |
+------------+------------------+------------------+---------------------+
| 121 (0x79) | *REGISTER_8BITS* | *WORD*           | ``SHLB BL, 4``      |
+------------+------------------+------------------+---------------------+

.. _instruction-shr:

SHR: 16-bits logical right shift
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Performs a `logical right shift <https://en.wikipedia.org/wiki/Logical_shift>`_
of the value of a 16-bits register. Every form of the instruction will have two
operands.  Operand 1 will always be a reference to a 16-bits register. Operand
2 will indicate the number of bit positions that the value shall be shifted.
The result will be stored in the register referenced by Operand 1. 

The operation will modify the values of the carry (C) and zero (Z) flags of the Status Register.

+------------+-------------------+-------------------+---------------------+
| Opcode     | Operand 1         | Operand 2         | Example             |
+============+===================+===================+=====================+
| 122 (0x7A) | *REGISTER_16BITS* | *REGISTER_16BITS* | ``SHR A, B``        |
+------------+-------------------+-------------------+---------------------+
| 123 (0x7B) | *REGISTER_16BITS* | *REGADDRESS*      | ``SHR C, [A-100]``  |
+------------+-------------------+-------------------+---------------------+
| 124 (0x7C) | *REGISTER_16BITS* | *ADDRESS*         | ``SHR D, [0x1000]`` |
+------------+-------------------+-------------------+---------------------+
| 125 (0x7D) | *REGISTER_16BITS* | *WORD*            | ``SHR B, 4``        |
+------------+-------------------+-------------------+---------------------+

.. _instruction-shrb:

SHRB: 8-bits logical right shift
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Performs a `logical right shift <https://en.wikipedia.org/wiki/Logical_shift>`_
of the value of an 8-bits register. Every form of the instruction will have two
operands.  Operand 1 will always be a reference to an 8-bits register. Operand
2 will indicate the number of bit positions that the value shall be shifted.
The result will be stored in the register referenced by Operand 1. 

The operation will modify the values of the carry (C) and zero (Z) flags of the Status Register.

+------------+------------------+------------------+---------------------+
| Opcode     | Operand 1        | Operand 2        | Example             |
+============+==================+==================+=====================+
| 126 (0x7E) | *REGISTER_8BITS* | *REGISTER_8BITS* | ``SHRB AH, BL``     |
+------------+------------------+------------------+---------------------+
| 127 (0x7F) | *REGISTER_8BITS* | *REGADDRESS*     | ``SHRB CL, [A+30]`` |
+------------+------------------+------------------+---------------------+
| 128 (0x80) | *REGISTER_8BITS* | *ADDRESS*        | ``SHRB DH, [0x30]`` |
+------------+------------------+------------------+---------------------+
| 129 (0x81) | *REGISTER_8BITS* | *WORD*           | ``SHRB BL, 4``      |
+------------+------------------+------------------+---------------------+

.. _instruction-sret:

SRET: return from system call 
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Returns from an System Call (SVC). The execution of this instruction will
recover the Instruction Pointer (IP) and the user Stack Pointer (SP) stored in
the stack and jump to the IP address. This is a priviledged instruction that
can only be called when in Supervisor mode. When executed, the CPU will be
switched to User mode.

+------------+-----------+-----------+----------+
| Opcode     | Operand 1 | Operand 2 | Example  |
+============+===========+===========+==========+
| 134 (0x86) | *NONE*    | *NONE*    | ``SRET`` |
+------------+-----------+-----------+----------+

.. _instruction-sti:

STI: set interrupt mask 
^^^^^^^^^^^^^^^^^^^^^^^

Set the Interrupt Mask Bit of the Status Register. When the register is
cleared, the CPU interrupts are unmasked and, thus, enabled. The instruction
has no operands. This is a priviledged instruction that can only be called when
in Supervisor mode. 

+------------+-----------+-----------+---------+
| Opcode     | Operand 1 | Operand 2 | Example |
+============+===========+===========+=========+
| 129 (0x81) | *NONE*    | *NONE*    | ``STI`` |
+------------+-----------+-----------+---------+

.. _instruction-sub:

SUB: 16-bits substraction 
^^^^^^^^^^^^^^^^^^^^^^^^^

Performs a substraction of two 16-bits integers. Every form of the instruction
will have two operands. Operand 1 will always be a reference to a 16-bits
register. The integer contained by the register will be substracted from the
value referenced by Operand 2. The result will be stored in the register
referenced by Operand 1. 

The operation will modify the values of the carry (C) and zero (Z) flags of the Status Register.

+-----------+-------------------+-------------------+---------------------+
| Opcode    | Operand 1         | Operand 2         | Example             |
+===========+===================+===================+=====================+
| 25 (0x19) | *REGISTER_16BITS* | *REGISTER_16BITS* | ``SUB A, B``        |
+-----------+-------------------+-------------------+---------------------+
| 26 (0x1A) | *REGISTER_16BITS* | *REGADDRESS*      | ``SUB C, [A-100]``  |
+-----------+-------------------+-------------------+---------------------+
| 27 (0x1B) | *REGISTER_16BITS* | *ADDRESS*         | ``SUB D, [0x1000]`` |
+-----------+-------------------+-------------------+---------------------+
| 28 (0x1C) | *REGISTER_16BITS* | *WORD*            | ``SUB B, 12345``    |
+-----------+-------------------+-------------------+---------------------+

.. _instruction-subb:

SUBB: 8-bits substraction 
^^^^^^^^^^^^^^^^^^^^^^^^^

Performs a substraction of two 8-bits integers. Every form of the instruction
will have two operands. Operand 1 will always be a reference to an 8-bits
register. The integer contained by the register will be substracted from the
value referenced by Operand 2. The result will be stored in the register
referenced by Operand 1. 

The operation will modify the values of the carry (C) and zero (Z) flags of the Status Register.

+-----------+------------------+------------------+----------------------+
| Opcode    | Operand 1        | Operand 2        | Example              |
+===========+==================+==================+======================+
| 29 (0x1D) | *REGISTER_8BITS* | *REGISTER_8BITS* | ``SUBB BH, DL``      |
+-----------+------------------+------------------+----------------------+
| 30 (0x1E) | *REGISTER_8BITS* | *REGADDRESS*     | ``SUBB CH, [A-100]`` |
+-----------+------------------+------------------+----------------------+
| 31 (0x1F) | *REGISTER_8BITS* | *ADDRESS*        | ``SUBB DL, [0x400]`` |
+-----------+------------------+------------------+----------------------+
| 32 (0x20) | *REGISTER_8BITS* | *WORD*           | ``SUBB BL, 0x10``    |
+-----------+------------------+------------------+----------------------+

.. _instruction-svc:

SVC: system call 
^^^^^^^^^^^^^^^^

Performs a System Call (SVC). This instruction can only be executed when the
CPU is in User mode. The execution of this instruction will: setup the
Supervisor stack; push to it the Instruction Pointer (IP) and the user Stack
Pointer (SP); switch the CPU to Supervisor mode; and jump to address 0x0006.

+------------+-----------+-----------+---------+
| Opcode     | Operand 1 | Operand 2 | Example |
+============+===========+===========+=========+
| 133 (0x85) | *NONE*    | *NONE*    | ``SVC`` |
+------------+-----------+-----------+---------+

.. _instruction-xor:

XOR: 16-bits bitwise XOR
^^^^^^^^^^^^^^^^^^^^^^^^

Performs a `bitwise XOR <https://en.wikipedia.org/wiki/Bitwise_operation#XOR>`_
of two 16-bits integers. Every form of the instruction will have two operands.
Operand 1 will always be a reference to a 16-bits register. A logic XOR will be
performed between the contents of the register and the value referenced by
Operand 2. The result will be stored in the register referenced by Operand 1. 

+------------+-------------------+-------------------+--------------------+
| Opcode     | Operand 1         | Operand 2         | Example            |
+============+===================+===================+====================+
| 104 (0x68) | *REGISTER_16BITS* | *REGISTER_16BITS* | ``XOR C, B``       |
+------------+-------------------+-------------------+--------------------+
| 105 (0x69) | *REGISTER_16BITS* | *REGADDRESS*      | ``XOR C, [B-100]`` |
+------------+-------------------+-------------------+--------------------+
| 106 (0x6A) | *REGISTER_16BITS* | *ADDRESS*         | ``XOR D, [0x400]`` |
+------------+-------------------+-------------------+--------------------+
| 107 (0x6B) | *REGISTER_16BITS* | *WORD*            | ``XOR D, 0xA5A5``  |
+------------+-------------------+-------------------+--------------------+

.. _instruction-xorb:

XORB: 8-bits bitwise XOR
^^^^^^^^^^^^^^^^^^^^^^^^

Performs a `bitwise XOR <https://en.wikipedia.org/wiki/Bitwise_operation#XOR>`_
of two 8-bits integers. Every form of the instruction will have two operands.
Operand 1 will always be a reference to an 8-bits register. A logic XOR will be
performed between the contents of the register and the value referenced by
Operand 2. The result will be stored in the register referenced by Operand 1. 

+------------+------------------+------------------+---------------------+
| Opcode     | Operand 1        | Operand 2        | Example             |
+============+==================+==================+=====================+
| 108 (0x6C) | *REGISTER_8BITS* | *REGISTER_8BITS* | ``XORB CH, BL``     |
+------------+------------------+------------------+---------------------+
| 109 (0x6D) | *REGISTER_8BITS* | *REGADDRESS*     | ``XORB DL, [A+30]`` |
+------------+------------------+------------------+---------------------+
| 110 (0x6E) | *REGISTER_8BITS* | *ADDRESS*        | ``XORB CH, [0x30]`` |
+------------+------------------+------------------+---------------------+
| 111 (0x6F) | *REGISTER_8BITS* | *WORD*           | ``XORB BL, 0xA5``   |
+------------+------------------+------------------+---------------------+
