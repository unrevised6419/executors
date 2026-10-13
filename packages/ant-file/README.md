# @repo/ant-file

Reads and writes the original program's `.ant` files ([ant-spec §7](../ant-spec/furnica-language-spec.md)). A file holds a starting world and the program text.

```ts
import { parse } from "@repo/ant-grammar";
import { runProgram } from "@repo/ant-runtime";
import { readAntFile, writeAntFile } from "@repo/ant-file";

const { world, source } = readAntFile(bytes); // windows-1250 by default
const { program } = parse(source, { language: "ro" });
const result = runProgram(program!, { world });

const saved = writeAntFile({ world, source }); // opens in the original
```

## Format

Single-byte text with CRLF line endings:

```
Ant executor file
[table description]
1 1          ← ant column and row
1            ← facing: 1 down, 2 left, 3 up, 4 right
1 1 *        ← one line per non-empty cell, row by row; * is the ant
3 1 A
666 666 *    ← terminator
INCEPUT      ← the program, verbatim
DREAPTA
SFIRSIT
```

## Reading

- **Encoding.** The original wrote the system code page, so Romanian files are windows-1250 and Russian files windows-1251. Pass `{ encoding }` to choose; `utf-8` is also accepted. A string input is used as is.
- **Leniency.** Like the original, the reader skips the two header lines and the `*` cell, accepts LF line endings and stops at the first cell whose column is 666. The program is kept verbatim, with `\n` line endings; a final line break is dropped.
- **Errors.** Anything the original would crash on, or silently mangle, throws an `AntFileError` with a `code` and the 1-based `line`: `missing-header`, `invalid-position`, `invalid-facing`, `invalid-cell`, `missing-terminator`, or `invalid-world` (with the `checkWorld` problem: a cell outside the grid, an object on the ant, a cell listed twice).
- **Language.** The file does not say which language the program is in; the caller chooses.

## Writing

`writeAntFile` writes exactly what the original writes, byte for byte: the header, the cells row by row with `*` at the ant, the terminator and the program without a final line break. `formatAntFile` returns the same as text. Both throw a `RangeError` for an invalid world, a `*` object (it would read back as the ant), or a character the encoding cannot represent.

## Tests

`tests/fixtures/` holds `.ant` files in windows-1250 and windows-1251. The tests read them, write them back byte for byte, parse and run them, and cover every reading error.
