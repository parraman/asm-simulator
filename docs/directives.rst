Directives
==========

This section covers the directives supported by the simulator. Specifically,
the simulator supports the following directives:

* :ref:`directive-db`
* :ref:`directive-dw`
* :ref:`directive-org`
* :ref:`directive-equ`

.. _directive-db:

DB: Define Byte 
^^^^^^^^^^^^^^^

This directive allows you to reserve memory space for *one byte* (8 bits). The
receive directive receives two operands. Operand 1 sets the name or identifier
assigned to the space. Operand 2 sets the initialization value of the reserved
space. This operand can be a numeric value, a character or an array of
characters. In the case of a single character, the initial value stored will
correspond to the ASCII code of the character encoded in single quotes (``''``). In the
case of an array, the values corresponding to the ASCII codes of those encoded
between double quotes (``""```) will be encoded. If you want to encode a numeric value
explicitly within the array, you must do it using the escape code ``\x``.

+-----------------------------------+------------------------------------------------------------------+
| Directive                         | Result                                                           |
+===================================+==================================================================+
| ``DB var1, 0x01``                 | Reserseves one byte with an initial value of 0x01                |
+-----------------------------------+------------------------------------------------------------------+
| ``DB char1, '1'``                 | Reserseves one byte with an initial value of 0x31                |
+-----------------------------------+------------------------------------------------------------------+
| ``DB string, "Hello"``            | Reserseves five bytes with values {0x48, 0x65, 0x6C, 0x6C, 0x6F} |
+-----------------------------------+------------------------------------------------------------------+
| ``DB string, "\x01\x02\x03\x04"`` | Reserseves four bytes with values {0x01, 0x02, 0x03, 0x04}       |
+-----------------------------------+------------------------------------------------------------------+

.. _directive-dw:

DW: Define Word
^^^^^^^^^^^^^^^

This directive allows you to reserve memory space for *two bytes* (16 bits). The
receive directive receives two operands. Operand 1 sets the name or identifier
assigned to the space. Operand 2 sets the initialization value of the reserved
space. This operand can only be of numeric type.

+---------------------+-----------------------------------------------+
| Directive           | Result                                        |
+=====================+===============================================+
| ``DW var1, 2048``   | Reserseves two bytes with values {0x80, 0x00} |
+---------------------+-----------------------------------------------+
| ``DW var2, 0x1FFF`` | Reserseves two bytes with values {0x1F, 0xFF} |
+---------------------+-----------------------------------------------+

.. _directive-org:

ORG: Advance Program Counter
^^^^^^^^^^^^^^^^^^^^^^^^^^^^

This directive allows moving the program counter to a given address. The
directive contains a single operand that sets the address from which subsequent
instructions are to be encoded.

+-----------------+-------------------------------------------------------------------------+
| Directive       | Result                                                                  |
+=================+=========================================================================+
| ``ORG 0x100``   | The subsequent instructions will be encoded starting from address 0x100 |
+-----------------+-------------------------------------------------------------------------+


.. _directive-equ:

EQU: Define symbolic name 
^^^^^^^^^^^^^^^^^^^^^^^^^

The EQU directive gives a symbolic name or tag to an expression. This tag can
be later used in subsequent lines of assembly code and will be substituted by
the value given. The directive receives two operands. The first sets the label
or symbolic name. The second defines the expression by which occurrences of the
label will be replaced in the code. These occurrences will only be evaluated in
lines of code following the definition of the label.

+---------------------------+------------------------------------------------------------------+
| Directive                 | Result                                                           |
+===========================+==================================================================+
| ``EOS EQU 255``           | Any occurrence of ``EOS`` will be sustitued by ``255``           |
+---------------------------+------------------------------------------------------------------+
| ``TMRPRELOAD EQU 0x0003`` | Any occurrence of ``TMRPRELOAD`` will be sustitued by ``0x0003`` |
+---------------------------+------------------------------------------------------------------+

