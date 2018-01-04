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

The assembler simulator supports the following instructions.

+------------------------------+-----------+------------+-----------+
| :ref:`ADD <instruction-add>` | ``ADDB``  | ``AND``    | ``ANDB``  |
+------------------------------+-----------+------------+-----------+
| ``CALL``                     | ``CLI``   | ``CMP``    | ``CMPB``  |
+------------------------------+-----------+------------+-----------+
| ``DEC``                      | ``DECB``  | ``DIV``    | ``DIVB``  |
+------------------------------+-----------+------------+-----------+
| ``HLT``                      | ``IN``    | ``INC``    | ``INCB``  |
+------------------------------+-----------+------------+-----------+
| ``IRET``                     | ``JA``    | ``JAE``    | ``JB``    |
+------------------------------+-----------+------------+-----------+
| ``JBE``                      | ``JC``    | ``JE``     | ``JMP``   |
+------------------------------+-----------+------------+-----------+
| ``JNA``                      | ``JNAE``  | ``JNB``    | ``JNBE``  |
+------------------------------+-----------+------------+-----------+
| ``JNC``                      | ``JNE``   | ``JNZ``    | ``JZ``    |
+------------------------------+-----------+------------+-----------+
| ``MOV``                      | ``MOVB``  | ``MUL``    | ``MULB``  |
+------------------------------+-----------+------------+-----------+
| ``NOT``                      | ``OR``    | ``ORB``    | ``OUT``   |
+------------------------------+-----------+------------+-----------+
| ``POP``                      | ``POPB``  | ``PUSH``   | ``PUSHB`` |
+------------------------------+-----------+------------+-----------+
| ``RET``                      | ``SHL``   | ``SHLB``   | ``SHR``   |
+------------------------------+-----------+------------+-----------+
| ``SHRB``                     | ``SRET``  | ``STI``    | ``SUB``   |
+------------------------------+-----------+------------+-----------+
| ``SUBB``                     | ``SVC``   | ``XOR``    | ``XORB``  |
+------------------------------+-----------+------------+-----------+

.. _instruction-add:

ADD: 16-bits addition
^^^^^^^^^^^^^^^^^^^^^

Performs an addition of two 16-bits integers. Every form of the instruction
will have two operands. Operand 1 will always be a reference to a 16-bits
register. The integer contained by the register will be added to the value
referenced by Operand 2 and then the result will be stored in the register
referenced by Operand 1. The instruction shall have a different *opcode*
depending on the types of the operands. The *opcodes* are all expressed using
decimal format.

+--------+-------------------+-------------------+---------------------+
| Opcode | Operand 1         | Operand 2         | Example             |
+========+===================+===================+=====================+
| 17     | *REGISTER_16BITS* | *REGISTER_16BITS* | ``ADD A, B``        |
+--------+-------------------+-------------------+---------------------+
| 18     | *REGISTER_16BITS* | *REGADDRESS*      | ``ADD C, [A-100]``  |
+--------+-------------------+-------------------+---------------------+
| 19     | *REGISTER_16BITS* | *ADDRESS*         | ``ADD D, [0x1000]`` |
+--------+-------------------+-------------------+---------------------+
| 20     | *REGISTER_16BITS* | *WORD*            | ``ADD B, 12345``    |
+--------+-------------------+-------------------+---------------------+
