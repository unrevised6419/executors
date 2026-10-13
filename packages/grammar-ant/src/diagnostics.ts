/**
 * Diagnostics: structured errors with a stable `code`.
 *
 * Diagnostics carry data, not prose, so the IDE can show them in the
 * student's language. `formatMessage` renders the English text.
 */

import type { Range } from "./ast.ts";
import type { KeywordSet, Role } from "./keywords.ts";

/** Something the parser expected or found, in user terms. */
export type Expectation = Role | "newline" | "name" | "number" | "end of file";

export type BlockKind = "repeat" | "while" | "procedure" | "program";

export type Diagnostic = { readonly range: Range } & (
	| { readonly code: "invalid-character"; readonly text: string }
	| {
			readonly code: "unexpected";
			readonly expected: readonly Expectation[];
			readonly found: Expectation;
			readonly text: string;
	  }
	/** A keyword where a procedure name is required. */
	| {
			readonly code: "reserved-word";
			readonly role: Role;
			readonly text: string;
	  }
	/** More words after a complete statement. */
	| { readonly code: "trailing-text"; readonly text: string }
	/** The file ends inside a block. */
	| { readonly code: "missing-end"; readonly block: BlockKind }
	/** `END` followed by the wrong block word, e.g. `END WHILE` closing a REPEAT. */
	| {
			readonly code: "mismatched-end";
			readonly block: BlockKind;
			readonly text: string;
	  }
	/** A line that cannot start a statement, such as `THEN UP`. */
	| { readonly code: "invalid-statement"; readonly text: string }
	/** A procedure definition after `BEGIN` or inside another block. */
	| { readonly code: "misplaced-procedure" }
	| { readonly code: "missing-begin" }
	/** Anything other than blank lines and comments after the program's `END`. */
	| { readonly code: "code-after-end" }
	| {
			readonly code: "duplicate-procedure";
			readonly name: string;
			readonly first: Range;
	  }
	| { readonly code: "undefined-procedure"; readonly name: string }
	/** A procedure name must start with a letter. */
	| { readonly code: "invalid-name"; readonly name: string }
	/** A REPEAT count above 2147483647. */
	| { readonly code: "count-too-large"; readonly text: string }
);

export type DiagnosticCode = Diagnostic["code"];

export const MAX_REPEAT_COUNT = 2_147_483_647;

const BLOCK_ROLE = {
	repeat: "REPEAT",
	while: "WHILE",
	procedure: "PROC",
	program: undefined,
} as const satisfies Record<BlockKind, Role | undefined>;

function show(set: KeywordSet, e: Expectation): string {
	if (e === "newline") return "end of line";
	if (e === "name") return "a procedure name";
	if (e === "number") return "a number";
	if (e === "end of file") return e;
	return set.keywords[e];
}

function closer(set: KeywordSet, block: BlockKind): string {
	const role = BLOCK_ROLE[block];
	return role === undefined
		? set.keywords.END
		: `${set.keywords.END} ${set.keywords[role]}`;
}

/** English text for a diagnostic, with keywords spelled in the program's language. */
export function formatMessage(d: Diagnostic, set: KeywordSet): string {
	switch (d.code) {
		case "invalid-character":
			return `Invalid character "${d.text}".`;
		case "unexpected": {
			const expected = d.expected.map((e) => show(set, e));
			const list =
				expected.length <= 1
					? (expected[0] ?? "nothing")
					: `${expected.slice(0, -1).join(", ")} or ${expected.at(-1)}`;
			return `Expected ${list}, but found ${d.text === "" ? show(set, d.found) : `"${d.text}"`}.`;
		}
		case "reserved-word":
			return `"${d.text}" is a keyword and cannot be used as a procedure name.`;
		case "trailing-text":
			return `Unexpected "${d.text}": only one statement is allowed per line.`;
		case "missing-end":
			return `Missing ${closer(set, d.block)}.`;
		case "mismatched-end":
			return `Expected ${closer(set, d.block)}, but found "${d.text}".`;
		case "invalid-statement":
			return `"${d.text}" cannot start a statement.`;
		case "misplaced-procedure":
			return `Procedures must be defined before ${set.keywords.BEGIN}, outside any other block.`;
		case "missing-begin":
			return `Missing ${set.keywords.BEGIN}.`;
		case "code-after-end":
			return `Nothing may follow ${set.keywords.END}.`;
		case "duplicate-procedure":
			return `Procedure "${d.name}" is already defined on line ${d.first.start.line}.`;
		case "undefined-procedure":
			return `Unknown procedure "${d.name}".`;
		case "invalid-name":
			return `"${d.name}" is not a valid procedure name: it must start with a letter.`;
		case "count-too-large":
			return `The count ${d.text} is too large; the maximum is ${MAX_REPEAT_COUNT}.`;
	}
}
