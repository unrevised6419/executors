# @repo/ant-runtime

Interpreter for the Furnica (ant) language. It runs a program parsed by [`@repo/ant-grammar`](../ant-grammar) on the 10 × 10 grid, one step at a time.

```ts
import { parse } from "@repo/ant-grammar";
import { Run, runProgram } from "@repo/ant-runtime";

const { program } = parse(source, { language: "ro" });

// To the end:
const { status, error, world } = runProgram(program!);

// Or step by step, e.g. to animate the ant:
const run = new Run(program!, { world });
while (run.status === "running") {
	highlight(run.next); // the source the next step runs
	const step = run.step(); // move, test, repeat, call or error
}
```

## Semantics

The runtime follows the corrected semantics of [ant-spec §5.9](../ant-spec/furnica-language-spec.md), without a compatibility mode:

- **World.** Cells are 1-based: `x` is the column, left to right, and `y` the row, top to bottom. The default start is the original's: the ant at (1,1) facing down, no objects. An object is one visible character (one grapheme, not blank). The ant is not stored in the grid, so it can never be overwritten.
- **Moves.** The ant turns to the move's direction, then steps one cell. An object in that cell is pushed one cell further. The move fails, and the ant stays where it was, when it would leave the grid (`wall`), push an object off the grid (`push-off-grid`) or push into a second object (`push-blocked`). **A failed move still turns the ant**, as in the original.
- **Conditions.** `AT_EDGE` is true when the cell in front of the ant is outside the grid. Objects do not count. IF and WHILE test the same edges.
- **Control flow.** Every statement works in every context, at any depth. `WHILE` tests before every pass. `REPEAT 0` runs nothing. Procedures may call themselves and each other.
- **Errors.** The first error stops the whole program, also inside procedures.
- **Limits.** A run fails with `step-limit` after `maxSteps` steps (default 100,000) and with `depth-limit` at `maxDepth` nested calls (default 1,000). Both are options of `Run` and `runProgram`.

## Steps

Each call to `step()` runs one statement and reports it:

| Step     | Statement                                 | Range                                 |
| -------- | ----------------------------------------- | ------------------------------------- |
| `move`   | a move, with any push                     | the move word                         |
| `test`   | an IF or WHILE condition, with its result | the IF line, or the `WHILE … DO` line |
| `repeat` | entering a REPEAT                         | the `REPEAT n TIMES` line             |
| `call`   | entering a procedure                      | the call                              |
| `error`  | the step that failed                      | the failing statement                 |

An IF branch is the step after its test. The WHILE test runs again after each pass. Calls and loops live on an explicit stack, so deep recursion never overflows the JavaScript stack, and `callStack` lists the procedures being run.

## Tests

```sh
pnpm test
```

`tests/corpus/` holds one `.antp` program per case and a `.json` file with its start and expected end grid, drawn as text (`@` is the ant, `.` an empty cell), plus the runtime error if any. It covers the spec's §11 test cases with their corrected results, moves and pushes, control flow, procedures, limits and the three languages. `tests/api.test.ts` covers stepping and grid validation.
