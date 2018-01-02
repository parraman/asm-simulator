Instruction Set
===============

This section covers the complete set of instructions that are included in the
simulator. Each instruction is identified by an *opcode* (operation code), a
mnemonic and the type of its parameters. An instruction can have zero, one or
two parameters. Two or more instructions of the same type can have the same
mnemonic (e.g. `MOV`) but differ in their operation code, depending on the type
of the operands that are involved. Thus, an instruction is always coded in
memory as follows:

+-------------+---------------+---------------+
| ``opcode``  | ``Operand 1`` | ``Operand 2`` |
| *mandatory* |   *optional*  |   *optional*  |
+-------------+---------------+---------------+

The size of the operation code is always of **8 bits**, while the size of the
operands can be **8 or 16 bits**, depending on their type.


Operand types
-------------

The type of operands or *addressing modes* supported by the simulator are the
following. The table includes the code name of the operand type, a short
description, and the size of the instruction operand in memory.

+---------------------+------------------------------+---------+
| Operand type        | Description                  |  Size   |
+=====================+==============================+=========+
| ``BYTE``            | 8-bits immediate value       | 8 bits  |
+---------------------+------------------------------+---------+
| ``WORD``            | 16-bits immediate value      | 16 bits |
+---------------------+------------------------------+---------+
| ``ADDRESS``         | 16-bits address              | 16 bits |
+---------------------+------------------------------+---------+
| ``REGISTER_8BITS``  | 8-bits register              | 8 bits  |
+---------------------+------------------------------+---------+
| ``REGISTER_16BITS`` | 16-bits register             | 8 bits  |
+---------------------+------------------------------+---------+
| ``REGADDRESS``      | Register addressing + offset | 16 bits |
+---------------------+------------------------------+---------+

Numbering formats
-----------------

The assembler supports the following numbering formats:

* Decimal: `10`, `2939`, etc.


Instructions description
------------------------

The assembler simulator supports the following instructions.

+-----------+-----------+------------+-----------+
| ``ADD``   | ``ADDB``  | ``AND``    | ``ANDB``  |
+-----------+-----------+------------+-----------+
| ``CALL``  | ``CLI``   | ``CMP``    | ``CMPB``  |
+-----------+-----------+------------+-----------+
| ``DEC``   | ``DECB``  | ``DIV``    | ``DIVB``  |
+-----------+-----------+------------+-----------+
| ``HLT``   | ``IN``    | ``INC``    | ``INCB``  |
+-----------+-----------+------------+-----------+
| ``IRET``  | ``JA``    | ``JAE``    | ``JB``    |
+-----------+-----------+------------+-----------+
| ``JBE``   | ``JC``    | ``JE``     | ``JMP``   |
+-----------+-----------+------------+-----------+
| ``JNA``   | ``JNAE``  | ``JNB``    | ``JNBE``  |
+-----------+-----------+------------+-----------+
| ``JNC``   | ``JNE``   | ``JNZ``    | ``JZ``    |
+-----------+-----------+------------+-----------+
| ``MOV``   | ``MOVB``  | ``MUL``    | ``MULB``  |
+-----------+-----------+------------+-----------+
| ``NOT``   | ``OR``    | ``ORB``    | ``OUT``   |
+-----------+-----------+------------+-----------+
| ``POP``   | ``POPB``  | ``PUSH``   | ``PUSHB`` |
+-----------+-----------+------------+-----------+
| ``RET``   | ``SHL``   | ``SHLB``   | ``SHR``   |
+-----------+-----------+------------+-----------+
| ``SHRB``  | ``SRET``  | ``STI``    | ``SUB``   |
+-----------+-----------+------------+-----------+
| ``SUBB``  | ``SVC``   | ``XOR``    | ``XORB``  |
+-----------+-----------+------------+-----------+

``ADD``: 16-bits addition
^^^^^^^^^^^^^^^^^^^^^^^^^

+--------+----------------+------------+------------------+
| Opcode | Operand 1      | Operand 2  | Example          |
+=========================+============+==================+
| 01     | ``REGADDRESS`` | ``WORD``   | `MOV [A], 0x345` |
+--------+----------------+------------+------------------+
