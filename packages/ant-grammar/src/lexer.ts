/**
 * Lexer: the same token stream feeds the parser and the editor highlighter.
 *
 * The Chevrotain lexer only knows the language-independent shapes (words,
 * numbers, newlines, comments, whitespace). Keywords are found afterwards by
 * `classify`, which compares each word with the keyword set of the program's
 * language and retypes it to its role token. Keeping keywords out of the
 * lexer definition lets one lexer and one parser serve every language.
 */

import {
	createToken,
	Lexer,
	type CustomPatternMatcherFunc,
	type IToken,
	type TokenType,
} from "chevrotain";
import { ROLES, spellings, type KeywordSet, type Role } from "./keywords.ts";
import { sameWord } from "./text.ts";

/** A statement separator. Exactly one statement per line, as in the original. */
export const Newline = createToken({
	name: "Newline",
	pattern: /\r\n|\r|\n/,
	line_breaks: true,
});

/** Any other whitespace (spaces, tabs, Unicode spaces) separates words. */
export const Whitespace = createToken({
	name: "Whitespace",
	pattern: /[^\S\r\n\u2028\u2029]+/,
	group: Lexer.SKIPPED,
});

export const Comment = createToken({
	name: "Comment",
	pattern: /\/\/[^\r\n\u2028\u2029]*/,
	group: "comments",
});

/**
 * Match `regex` at `offset`. Chevrotain's regex analyser does not understand
 * Unicode property escapes (`\p{L}`), so these tokens use custom matchers.
 */
function matcher(regex: RegExp): CustomPatternMatcherFunc {
	const sticky = new RegExp(regex.source, `${regex.flags}y`);
	return (text, offset) => {
		sticky.lastIndex = offset;
		return sticky.exec(text);
	};
}

/** A REPEAT count. Only ASCII digits, and not directly followed by a letter. */
export const NumberLiteral = createToken({
	name: "Number",
	pattern: matcher(/[0-9]+(?![\p{L}\p{M}\p{N}_])/u),
	line_breaks: false,
});

/** A word that is not a keyword: a procedure name. */
export const Name = createToken({
	name: "Name",
	pattern: matcher(/[\p{L}\p{M}\p{N}_]+/u),
	line_breaks: false,
});

/** One token type per keyword role; produced only by `classify`. */
export const Keyword = Object.fromEntries(
	ROLES.map((role) => [role, createToken({ name: role, pattern: Lexer.NA })]),
) as Readonly<Record<Role, TokenType>>;

export const allTokens: readonly TokenType[] = [
	Newline,
	Whitespace,
	Comment,
	NumberLiteral,
	Name,
	...ROLES.map((role) => Keyword[role]),
];

const lexer = new Lexer([Newline, Whitespace, Comment, NumberLiteral, Name], {
	ensureOptimizations: false,
	positionTracking: "full",
});

export interface LexError {
	readonly offset: number;
	readonly length: number;
	readonly line: number;
	readonly column: number;
}

export interface LexResult {
	readonly tokens: IToken[];
	readonly comments: IToken[];
	readonly errors: LexError[];
}

/** The role of `word` in `set`, or `undefined` if it is not a keyword. */
export function keywordRole(set: KeywordSet, word: string): Role | undefined {
	return ROLES.find((role) =>
		spellings(set, role).some((s) => sameWord(word, s)),
	);
}

function classify(set: KeywordSet, token: IToken): IToken {
	if (token.tokenType !== Name) return token;
	const role = keywordRole(set, token.image);
	if (role === undefined) return token;
	const type = Keyword[role];
	return { ...token, tokenType: type, tokenTypeIdx: type.tokenTypeIdx! };
}

export function tokenize(source: string, set: KeywordSet): LexResult {
	const result = lexer.tokenize(source);
	return {
		tokens: result.tokens.map((token) => classify(set, token)),
		comments: result.groups["comments"] ?? [],
		errors: result.errors.map((e) => ({
			offset: e.offset,
			length: e.length,
			line: e.line ?? 1,
			column: e.column ?? 1,
		})),
	};
}
