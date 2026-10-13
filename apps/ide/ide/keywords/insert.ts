import type { KeywordSet, Role } from "@repo/ant-grammar";

/** A keyword role, or the original's "END..." button, which appends END for the user to complete. */
export type KeywordButton = Role | "END_BLOCK";

export const KEYWORD_BUTTONS: readonly KeywordButton[] = [
	"BEGIN",
	"END",
	"UP",
	"DOWN",
	"LEFT",
	"RIGHT",
	"REPEAT",
	"TIMES",
	"WHILE",
	"DO",
	"IF",
	"THEN",
	"ELSE",
	"PROC",
	"AT_EDGE",
	"NOT_AT_EDGE",
	"END_BLOCK",
];

export function buttonLabel(button: KeywordButton, set: KeywordSet): string {
	return button === "END_BLOCK"
		? `${set.keywords.END}...`
		: set.keywords[button];
}

/** Text to insert at `line`:`column` (1-based), and where the caret goes after. */
export interface Insertion {
	readonly line: number;
	readonly column: number;
	readonly text: string;
	readonly caret: { readonly line: number; readonly column: number };
}

/**
 * The original's insert buttons (ant-spec §10): BEGIN and END insert a line
 * above the caret line; every other keyword is appended to the caret line,
 * followed by a space (DO without one). Unlike the original, a space is added
 * before the keyword when the line ends in a word.
 */
export function keywordInsertion(
	button: KeywordButton,
	set: KeywordSet,
	lineText: string,
	caretLine: number,
): Insertion {
	if (button === "BEGIN" || button === "END") {
		return {
			line: caretLine,
			column: 1,
			text: `${set.keywords[button]}\n`,
			caret: { line: caretLine + 1, column: lineText.length + 1 },
		};
	}
	const word =
		button === "END_BLOCK" ? set.keywords.END : set.keywords[button];
	const before = lineText === "" || /\s$/u.test(lineText) ? "" : " ";
	const after = button === "DO" ? "" : " ";
	const text = `${before}${word}${after}`;
	const column = lineText.length + 1;
	return {
		line: caretLine,
		column,
		text,
		caret: { line: caretLine, column: column + text.length },
	};
}
