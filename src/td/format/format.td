((section)

((heading))
A principled text-first format for writing documents

Html favors code over text. Common characters in text need to be escaped. A document format should favor text over code. Markdown favors text but its rules are not principled. It is too easy to have unintended formatting and embedding code in markdown is too difficult.

A text document will be interpreted as spans of text with spans of code interspersed in and around the spans of text to provide extra information and structure. Since extra information is normally expressed with parentheses, spans of code will be in parentheses. Since parentheses may also appear in normal text, double parentheses are used for code, i.e, two consecutive opening parentheses will be interpreted as the 'start-marker' for embedded code. Even though double parentheses are not likely to appear in normal text, they will appear in documents like this one, and they may appear in the embedded code, where they will need to be escaped. An opening parenthesis immediately after the start marker will escape the interpretation of the marker, i.e, three consecutive opening parentheses will be interpreted as two and the characters immediately after this will not be interpreted as code.

There are three kinds of code spans.
A 'standalone' span that is just embedded within text and does not add either information or structure to the spans around it. For example, an inline code fragment. This is written as (((code `inline code fragment`/))) and looks like ((code `inline code fragment`/)). The slash before the closing parentheses indicate that this code span is standalone.
A 'next-line' code span applies some additional information to an entire line of text immediately after it. For example the (((heading))) span indicates that the line after it is a heading.
An 'enclosing' code span encloses other text and code spans. Hence it needs start and end tags. For example, a section is started with (((section) and ended with (section)))

Just like three opening parentheses are required to escape the start-marker interpretation, three closing parentheses are required to escape the end-marker interpretation.

(section))