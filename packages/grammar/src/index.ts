import type { Program } from "./ast.ts";
import type { Diagnostic } from "./diagnostics.ts";
import { KEYWORD_SETS, type Language } from "./keywords.ts";
import { tokenize } from "./lexer.ts";
import { parseTokens, tokenRange } from "./parser.ts";
import { validate } from "./validate.ts";

export type * from "./ast.ts";
export {
	formatMessage,
	MAX_REPEAT_COUNT,
	type BlockKind,
	type Diagnostic,
	type DiagnosticCode,
	type Expectation,
} from "./diagnostics.ts";
export {
	createMonacoTokensProvider,
	highlightLine,
	MONACO_TOKEN,
	type HighlightToken,
	type TokenKind,
} from "./highlight.ts";
export {
	KEYWORD_SETS,
	LANGUAGES,
	ROLES,
	spellings,
	type KeywordSet,
	type Language,
	type Role,
} from "./keywords.ts";
export { keywordRole } from "./lexer.ts";
export { sameWord } from "./text.ts";

export interface ParseOptions {
	readonly language: Language;
}

export interface ParseResult {
	/** Present only when there are no diagnostics. */
	readonly program: Program | undefined;
	/** Sorted by position. */
	readonly diagnostics: readonly Diagnostic[];
}

/** Parse and check a program. It can be run only if `diagnostics` is empty. */
export function parse(source: string, options: ParseOptions): ParseResult {
	const lexed = tokenize(source, KEYWORD_SETS[options.language]);
	const lexical: Diagnostic[] = lexed.errors.map((e) => {
		const range = tokenRange({
			image: source.slice(e.offset, e.offset + e.length),
			startOffset: e.offset,
			endOffset: e.offset + e.length - 1,
			startLine: e.line,
			endLine: e.line,
			startColumn: e.column,
			endColumn: e.column + e.length - 1,
			tokenTypeIdx: 0,
			tokenType: undefined!,
		});
		return {
			code: "invalid-character",
			text: source.slice(e.offset, e.offset + e.length),
			range,
		};
	});
	const parsed = parseTokens(lexed.tokens);
	const semantic =
		parsed.program === undefined ? [] : validate(parsed.program, source);
	const diagnostics = [...lexical, ...parsed.diagnostics, ...semantic].sort(
		(a, b) => a.range.start.offset - b.range.start.offset,
	);
	return {
		program: diagnostics.length === 0 ? parsed.program : undefined,
		diagnostics,
	};
}
