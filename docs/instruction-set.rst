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

Numbering formats
-----------------

The assembler supports the following numbering formats:

* Decimal: 10, 2939d, etc.
* Octal: 0o237, 0o2332, etc.
* Binary: 0000000010001000b, 1111111101010101b, etc.
* Hexadecimal: 0x1000, 0x3FF, etc.

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

+----------+-----------+------------+-----------+
| ``HLT``  | ``IN``    | ``INC``    | ``INCB``  |
+----------+-----------+------------+-----------+
| ``IRET`` | ``JA``    | ``JAE``    | ``JB``    |
+----------+-----------+------------+-----------+
| ``JBE``  | ``JC``    | ``JE``     | ``JMP``   |
+----------+-----------+------------+-----------+
| ``JNA``  | ``JNAE``  | ``JNB``    | ``JNBE``  |
+----------+-----------+------------+-----------+
| ``JNC``  | ``JNE``   | ``JNZ``    | ``JZ``    |
+----------+-----------+------------+-----------+
| ``MOV``  | ``MOVB``  | ``MUL``    | ``MULB``  |
+----------+-----------+------------+-----------+
| ``NOT``  | ``OR``    | ``ORB``    | ``OUT``   |
+----------+-----------+------------+-----------+
| ``POP``  | ``POPB``  | ``PUSH``   | ``PUSHB`` |
+----------+-----------+------------+-----------+
| ``RET``  | ``SHL``   | ``SHLB``   | ``SHR``   |
+----------+-----------+------------+-----------+
| ``SHRB`` | ``SRET``  | ``STI``    | ``SUB``   |
+----------+-----------+------------+-----------+
| ``SUBB`` | ``SVC``   | ``XOR``    | ``XORB``  |
+----------+-----------+------------+-----------+

.. _instruction-add:

ADD: 16-bits addition
^^^^^^^^^^^^^^^^^^^^^

Performs an addition of two 16-bits integers. Every form of the instruction
will have two operands. Operand 1 will always be a reference to a 16-bits
register. The integer contained by the register will be added to the value
referenced by Operand 2. The result will be stored in the register referenced
by Operand 1. 

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

Performs an addition of two 8-bits integers. Every form of the instruction
will have two operands. Operand 1 will always be a reference to an 8-bits
register. The integer contained by the register will be added to the value
referenced by Operand 2. The result will be stored in the register referenced
by Operand 1.

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

Performs an bitwise logic AND of two 16-bits integers. Every form of the
instruction will have two operands. Operand 1 will always be a reference to a
16-bits register. A logic AND will be performed between the contents of the
register and the value referenced by Operand 2. The result will be stored in
the register referenced by Operand 1. 

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

Performs an bitwise logic AND of two 8-bits integers. Every form of the
instruction will have two operands. Operand 1 will always be a reference to an
8-bits register. A logic AND will be performed between the contents of the
register and the value referenced by Operand 2. The result will be stored in
the register referenced by Operand 1.

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
cleared, the CPU interrupts are masked and, thus, disabled. The instruction
has no operands.

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

DEC: decrement 8-bits register 
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Decrements the value of an 8-bits register by 1 unit. The result will be
stored in the same register. The operation will modify the values of the
**carry** (C) and **zero** (Z) flags of the Status Register. 

+-----------+-------------------+-----------+-----------+
| Opcode    | Operand 1         | Operand 2 | Example   |
+===========+===================+===========+===========+
| 36 (0x24) | *REGISTER_16BITS* | *NONE*    | ``DEC B`` |
+-----------+-------------------+-----------+-----------+

.. _instruction-div:

DIV: 16-bits division 
^^^^^^^^^^^^^^^^^^^^^

Divides the value stored in Register A by the 16-bits value referred to by
Operand 1. The result will be stored into Register A. The operation will
modify the values of the **carry** (C) and **zero** (Z) flags of the Status
Register. 

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
Register. 

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
