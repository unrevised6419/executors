# @repo/ant-grammar

Lexer, parser and static checker for the Furnica (ant) language, with syntax highlighting for the Monaco editor.

The language keeps the structure of the original 2000 program (see [`../ant-spec`](../ant-spec/furnica-language-spec.md)) but **none of its bugs**. Where this package differs from the original, the original was wrong; ant-spec §9 lists every such case.

```ts
import { parse, formatMessage, KEYWORD_SETS } from "@repo/ant-grammar";

const { program, diagnostics } = parse(source, { language: "ro" });
for (const d of diagnostics)
	console.log(d.range.start.line, formatMessage(d, KEYWORD_SETS.ro));
```

`program` is a strictly typed AST (`src/ast.ts`), present only when `diagnostics` is empty.

## The language

### Lexical rules

- **Lines.** A line break (CRLF, LF or CR) ends a statement. There is exactly one statement per line, and a statement never spans lines.
- **Whitespace.** Spaces, tabs and other Unicode whitespace separate words; their amount does not matter. Indentation is free.
- **Blank lines** and lines holding only whitespace or a comment are allowed anywhere.
- **Comments** start with `//` and run to the end of the line.
- **Words** are runs of letters, digits and `_` (any script).
- **Numbers** are ASCII digits only: no sign, no hex. A number glued to letters (`3ORI`) is a word, not a number.
- **Any other character** is an error.

### Word equality

Keywords and procedure names are compared ignoring **case and diacritics**: `SFIRSIT` = `sfîrșit`, `ş` = `ș` = `s`, `ё` = `е`. Letters whose base form differs stay distinct: `й` ≠ `и`, and `A_B` ≠ `AB`.

The comparison is `Intl.Collator("und", { sensitivity: "base" })`, the root locale. It cannot use the `ro` locale, which treats `ă`, `â`, `î`, `ș` and `ț` as separate letters and would make `SFIRSIT` ≠ `SFÎRȘIT`. Composed and decomposed forms (NFC/NFD) compare equal.

### Keywords

A program is written in one language (`ro`, `en` or `ru`), chosen by the caller. Only that language's keywords are keywords, and they are **reserved**: no procedure may be named like one.

| Role                     | `ro`                                 | `en`                             | `ru`                                  |
| ------------------------ | ------------------------------------ | -------------------------------- | ------------------------------------- |
| BEGIN / END              | `INCEPUT` / `SFIRSIT`                | `BEGIN` / `END`                  | `НАЧАЛО` / `КОНЕЦ`                    |
| UP / DOWN / LEFT / RIGHT | `SUS` / `JOS` / `STINGA` / `DREAPTA` | `UP` / `DOWN` / `LEFT` / `RIGHT` | `ВВЕРХ` / `ВНИЗ` / `ВЛЕВО` / `ВПРАВО` |
| REPEAT … TIMES           | `REPETA` … `ORI`                     | `REPEAT` … `TIMES`               | `ПОВТОРИ` … `РАЗ`                     |
| WHILE … DO               | `CIT` … `EXECUTA`                    | `WHILE` … `DO`                   | `ПОКА` … `ДЕЛАЙ`                      |
| IF … THEN … ELSE         | `DACA` … `ATUNCI` … `ALTFEL`         | `IF` … `THEN` … `ELSE`           | `ЕСЛИ` … `ТО` … `ИНАЧЕ`               |
| PROC                     | `PROCEDURA`                          | `PROCEDURE`                      | `ПРОЦЕДУРА`                           |
| AT_EDGE / NOT_AT_EDGE    | `E_MARGINE` / `NU_E_MARGINE`         | `AT_EDGE` / `NOT_AT_EDGE`        | `У_КРАЯ` / `НЕ_У_КРАЯ`                |

End markers are `END` followed by the block keyword: `SFIRSIT REPETA`, `SFIRSIT CIT`, `SFIRSIT PROCEDURA`.

Romanian also accepts the post-1993 spellings as aliases: `SFARSIT` (`SFÂRȘIT`), `STANGA` (`STÂNGA`) and `CAT` (`CÂT`). The other diacritic forms (`ÎNCEPUT`, `EXECUTĂ`, `DACĂ`, `REPETĂ`) already match.

### Grammar

`NL` is a line break; blank and comment lines may appear wherever `NL` does.

```ebnf
program   = { NL } { procedure { NL } } BEGIN NL block END { NL } ;
procedure = PROC name NL block END PROC NL ;
block     = { NL | statement NL } ;
statement = move | call | if | repeat | while ;
move      = UP | DOWN | LEFT | RIGHT ;
call      = name ;                                   (* the bare name: there is no call keyword *)
if        = IF condition THEN branch [ ELSE branch ] ;
branch    = move | call ;
repeat    = REPEAT number TIMES NL block END REPEAT ;
while     = WHILE condition DO NL block END WHILE ;
condition = AT_EDGE | NOT_AT_EDGE ;
```

### Static rules

- Procedures are defined before `BEGIN`, never inside another block, and nothing but blank lines and comments may follow the final `END`.
- A procedure name starts with a letter, is unique (under word equality), and is not a keyword.
- Every call names a defined procedure. Procedures may be defined in any order, and may call themselves or each other.
- A REPEAT count is 0 to 2147483647.
- Every block, including WHILE and procedures, needs its end marker.

Each error is a `Diagnostic` with a stable `code` and structured data; `formatMessage` renders the English text, and the IDE can translate by code. Parsing stops at the first syntax error; checks such as unknown procedures report every occurrence.

## File extensions

- `.antp`: program text only, as parsed by `parse`. Used for the test corpus and examples.
- `.ant`: the original exercise format: a header, the grid and the ant, then the program text (ant-spec §7). Reading and writing it is not part of this package.

## Highlighting

No token spans lines, so highlighting needs no state between lines. `highlightLine` classifies one line's tokens, and `createMonacoTokensProvider(language)` wraps it for `monaco.languages.setTokensProvider`. The token classes are in `MONACO_TOKEN`, for use in a theme.

## Tests

`pnpm test` runs:

- `tests/corpus/`: one `.antp` program plus a `.json` expectation per case. The expectation is either `ast` (the program is valid and parses to this tree, written without positions) or `errors` (the diagnostics, matched on the fields listed). `spec` points at the ant-spec section the case comes from. Cases are grouped as `spec/` (ant-spec §11), `quirks/` (what the original wrongly accepted or rejected), `lexical/` and `structure/`.
- `tests/api.test.ts`: word equality, ranges, messages and highlighting.

`pnpm typecheck` runs `tsc` in strict mode.
