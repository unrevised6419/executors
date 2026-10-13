/**
 * Syntax highlighting from the same lexer the parser uses.
 *
 * No token spans lines, so a line can be highlighted on its own: this fits
 * the Monaco `TokensProvider` API, which tokenizes one line at a time.
 */

import { Comment, Keyword, Name, NumberLiteral, tokenize } from "./lexer.ts";
import type { TokenType } from "chevrotain";
import { KEYWORD_SETS, ROLES, type Language, type Role } from "./keywords.ts";

export type TokenKind =
	| "keyword"
	| "move"
	| "condition"
	| "number"
	| "name"
	| "comment"
	| "invalid";

export interface HighlightToken {
	/** 0-based UTF-16 offset in the line. */
	readonly start: number;
	readonly length: number;
	readonly kind: TokenKind;
}

const ROLE_KIND: Readonly<Record<Role, TokenKind>> = {
	BEGIN: "keyword",
	END: "keyword",
	UP: "move",
	DOWN: "move",
	LEFT: "move",
	RIGHT: "move",
	REPEAT: "keyword",
	TIMES: "keyword",
	WHILE: "keyword",
	DO: "keyword",
	IF: "keyword",
	THEN: "keyword",
	ELSE: "keyword",
	PROC: "keyword",
	AT_EDGE: "condition",
	NOT_AT_EDGE: "condition",
};

const KIND_BY_TOKEN = new Map<TokenType, TokenKind>([
	[Name, "name"],
	[NumberLiteral, "number"],
	[Comment, "comment"],
	...ROLES.map((role): [TokenType, TokenKind] => [
		Keyword[role],
		ROLE_KIND[role],
	]),
]);

/** Tokens of one line, sorted by position. Whitespace is not reported. */
export function highlightLine(
	line: string,
	language: Language,
): HighlightToken[] {
	const { tokens, comments, errors } = tokenize(line, KEYWORD_SETS[language]);
	const result: HighlightToken[] = [];
	for (const token of [...tokens, ...comments]) {
		const kind = KIND_BY_TOKEN.get(token.tokenType);
		if (kind !== undefined) {
			result.push({
				start: token.startOffset,
				length: token.image.length,
				kind,
			});
		}
	}
	for (const error of errors) {
		result.push({
			start: error.offset,
			length: error.length,
			kind: "invalid",
		});
	}
	return result.sort((a, b) => a.start - b.start);
}

/** Monaco token class names for each kind, usable in a theme's `rules`. */
export const MONACO_TOKEN: Readonly<Record<TokenKind, string>> = {
	keyword: "keyword",
	move: "keyword.move",
	condition: "constant.condition",
	number: "number",
	name: "identifier",
	comment: "comment",
	invalid: "invalid",
};

interface MonacoState {
	clone(): MonacoState;
	equals(other: MonacoState): boolean;
}

/** No state carries across lines. */
const LINE_STATE: MonacoState = {
	clone: () => LINE_STATE,
	equals: (other) => other === LINE_STATE,
};

/**
 * A `monaco.languages.TokensProvider` for `monaco.languages.setTokensProvider`.
 * It is structurally typed, so this package does not depend on Monaco.
 */
export function createMonacoTokensProvider(language: Language) {
	return {
		getInitialState: (): MonacoState => LINE_STATE,
		tokenize: (line: string, state: MonacoState) => {
			const tokens: { startIndex: number; scopes: string }[] = [];
			let position = 0;
			for (const token of highlightLine(line, language)) {
				// Gaps (whitespace) get the default scope, as Monaco expects every offset covered.
				if (token.start > position)
					tokens.push({ startIndex: position, scopes: "" });
				tokens.push({
					startIndex: token.start,
					scopes: MONACO_TOKEN[token.kind],
				});
				position = token.start + token.length;
			}
			if (position < line.length)
				tokens.push({ startIndex: position, scopes: "" });
			return { tokens, endState: state };
		},
	};
}
