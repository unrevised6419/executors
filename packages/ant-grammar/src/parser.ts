/**
 * Parser: tokens to a typed AST.
 *
 * Grammar (one statement per line; `NL` is a line break, blank and
 * comment-only lines are allowed wherever `NL` is):
 *
 *   program   = { NL } { procedure { NL } } BEGIN NL block END { NL } ;
 *   procedure = PROC name NL block END PROC NL ;
 *   block     = { NL | statement NL } ;
 *   statement = move | call | if | repeat | while ;
 *   move      = UP | DOWN | LEFT | RIGHT ;
 *   call      = name ;
 *   if        = IF condition THEN branch [ ELSE branch ] ;
 *   branch    = move | call ;
 *   repeat    = REPEAT number TIMES NL block END REPEAT ;
 *   while     = WHILE condition DO NL block END WHILE ;
 *   condition = AT_EDGE | NOT_AT_EDGE ;
 *
 * The parser stops at the first syntax error; `toDiagnostic` turns it into a
 * structured diagnostic.
 */

import {
	EmbeddedActionsParser,
	EOF,
	type IParserErrorMessageProvider,
	type IRecognitionException,
	type IToken,
	type TokenType,
} from "chevrotain";
import type {
	Branch,
	Call,
	Condition,
	If,
	Move,
	Procedure,
	Program,
	Range,
	Repeat,
	Statement,
	While,
} from "./ast.ts";
import type { BlockKind, Diagnostic, Expectation } from "./diagnostics.ts";
import { allTokens, Keyword, Name, Newline, NumberLiteral } from "./lexer.ts";
import { ROLES, type Role } from "./keywords.ts";

function expectation(type: TokenType): Expectation {
	if (type === Newline) return "newline";
	if (type === Name) return "name";
	if (type === NumberLiteral) return "number";
	if (type === EOF) return "end of file";
	return type.name as Role;
}

/**
 * Chevrotain only reports errors as message strings, so the message carries
 * the expected token types as JSON for `toDiagnostic` to read back.
 */
const errorMessageProvider: IParserErrorMessageProvider = {
	buildMismatchTokenMessage: ({ expected }) =>
		JSON.stringify([expectation(expected)]),
	buildNotAllInputParsedMessage: () => "[]",
	buildNoViableAltMessage: ({ expectedPathsPerAlt }) =>
		JSON.stringify([
			...new Set(
				expectedPathsPerAlt
					.flat()
					.flatMap((path) => path.slice(0, 1).map(expectation)),
			),
		]),
	buildEarlyExitMessage: ({ expectedIterationPaths }) =>
		JSON.stringify([
			...new Set(
				expectedIterationPaths.flatMap((path) =>
					path.slice(0, 1).map(expectation),
				),
			),
		]),
};

export function tokenRange(first: IToken, last: IToken = first): Range {
	return {
		start: {
			line: first.startLine ?? 0,
			column: first.startColumn ?? 0,
			offset: first.startOffset,
		},
		end: {
			line: last.endLine ?? 0,
			column: (last.endColumn ?? -1) + 1,
			offset: (last.endOffset ?? -1) + 1,
		},
	};
}

function joinRanges(first: Range, last: Range): Range {
	return { start: first.start, end: last.end };
}

class FurnicaParser extends EmbeddedActionsParser {
	constructor() {
		super([...allTokens], { maxLookahead: 2, errorMessageProvider });
		this.performSelfAnalysis();
	}

	private readonly blankLines = this.RULE("blankLines", (): void => {
		this.MANY(() => this.CONSUME(Newline));
	});

	readonly program = this.RULE("program", (): Program => {
		const procedures: Procedure[] = [];
		this.SUBRULE(this.blankLines);
		this.MANY(() => {
			const procedure = this.SUBRULE(this.procedure);
			this.ACTION(() => procedures.push(procedure));
			this.SUBRULE2(this.blankLines);
		});
		const begin = this.CONSUME(Keyword.BEGIN);
		this.CONSUME(Newline);
		const body = this.SUBRULE(this.block);
		const end = this.CONSUME(Keyword.END);
		this.SUBRULE3(this.blankLines);
		const first = procedures[0]?.range ?? tokenRange(begin);
		return {
			kind: "program",
			procedures,
			body,
			range: joinRanges(first, tokenRange(end)),
		};
	});

	private readonly procedure = this.RULE("procedure", (): Procedure => {
		const proc = this.CONSUME(Keyword.PROC);
		const name = this.CONSUME(Name);
		this.CONSUME(Newline);
		const body = this.SUBRULE(this.block);
		this.CONSUME(Keyword.END);
		const close = this.CONSUME2(Keyword.PROC);
		this.CONSUME2(Newline);
		return {
			kind: "procedure",
			name: { text: name.image, range: tokenRange(name) },
			header: tokenRange(proc, name),
			body,
			range: tokenRange(proc, close),
		};
	});

	private readonly block = this.RULE("block", (): Statement[] => {
		const statements: Statement[] = [];
		this.MANY(() =>
			this.OR([
				{ ALT: () => this.CONSUME(Newline) },
				{
					ALT: () => {
						const statement = this.SUBRULE(this.statement);
						this.ACTION(() => statements.push(statement));
						this.CONSUME2(Newline);
					},
				},
			]),
		);
		return statements;
	});

	private readonly statement = this.RULE("statement", (): Statement =>
		this.OR([
			{ ALT: () => this.SUBRULE(this.move) },
			{ ALT: () => this.SUBRULE(this.call) },
			{ ALT: () => this.SUBRULE(this.ifStatement) },
			{ ALT: () => this.SUBRULE(this.repeat) },
			{ ALT: () => this.SUBRULE(this.whileStatement) },
		]),
	);

	private readonly move = this.RULE("move", (): Move => {
		const move = this.OR([
			{
				ALT: () => ({
					direction: "up" as const,
					token: this.CONSUME(Keyword.UP),
				}),
			},
			{
				ALT: () => ({
					direction: "down" as const,
					token: this.CONSUME(Keyword.DOWN),
				}),
			},
			{
				ALT: () => ({
					direction: "left" as const,
					token: this.CONSUME(Keyword.LEFT),
				}),
			},
			{
				ALT: () => ({
					direction: "right" as const,
					token: this.CONSUME(Keyword.RIGHT),
				}),
			},
		]);
		// During grammar recording sub-results are placeholders, so build nodes in ACTION.
		return this.ACTION(() => ({
			kind: "move",
			direction: move.direction,
			range: tokenRange(move.token),
		}));
	});

	private readonly call = this.RULE("call", (): Call => {
		const name = this.CONSUME(Name);
		const range = tokenRange(name);
		return { kind: "call", name: { text: name.image, range }, range };
	});

	private readonly branch = this.RULE("branch", (): Branch =>
		this.OR([
			{ ALT: () => this.SUBRULE(this.move) },
			{ ALT: () => this.SUBRULE(this.call) },
		]),
	);

	private readonly condition = this.RULE("condition", (): Condition => {
		return this.OR([
			{ ALT: () => (this.CONSUME(Keyword.AT_EDGE), "atEdge" as const) },
			{
				ALT: () => (
					this.CONSUME(Keyword.NOT_AT_EDGE),
					"notAtEdge" as const
				),
			},
		]);
	});

	private readonly ifStatement = this.RULE("if", (): If => {
		const head = this.CONSUME(Keyword.IF);
		const condition = this.SUBRULE(this.condition);
		this.CONSUME(Keyword.THEN);
		const then = this.SUBRULE(this.branch);
		const otherwise = this.OPTION(() => {
			this.CONSUME(Keyword.ELSE);
			return this.SUBRULE2(this.branch);
		});
		return this.ACTION(() => ({
			kind: "if",
			condition,
			then,
			else: otherwise,
			range: joinRanges(tokenRange(head), (otherwise ?? then).range),
		}));
	});

	private readonly repeat = this.RULE("repeat", (): Repeat => {
		const head = this.CONSUME(Keyword.REPEAT);
		const count = this.CONSUME(NumberLiteral);
		const times = this.CONSUME(Keyword.TIMES);
		this.CONSUME(Newline);
		const body = this.SUBRULE(this.block);
		this.CONSUME(Keyword.END);
		const close = this.CONSUME2(Keyword.REPEAT);
		return {
			kind: "repeat",
			count: Number(count.image),
			countRange: tokenRange(count),
			header: tokenRange(head, times),
			body,
			range: tokenRange(head, close),
		};
	});

	private readonly whileStatement = this.RULE("while", (): While => {
		const head = this.CONSUME(Keyword.WHILE);
		const condition = this.SUBRULE(this.condition);
		const doToken = this.CONSUME(Keyword.DO);
		this.CONSUME(Newline);
		const body = this.SUBRULE(this.block);
		this.CONSUME(Keyword.END);
		const close = this.CONSUME2(Keyword.WHILE);
		return {
			kind: "while",
			condition,
			header: tokenRange(head, doToken),
			body,
			range: tokenRange(head, close),
		};
	});
}

const parser = new FurnicaParser();

export interface ParseResult {
	readonly program: Program | undefined;
	readonly diagnostics: Diagnostic[];
}

export function parseTokens(tokens: IToken[]): ParseResult {
	parser.input = tokens;
	const program = parser.program();
	return {
		program: parser.errors.length === 0 ? program : undefined,
		diagnostics: parser.errors.map((error) => toDiagnostic(error, tokens)),
	};
}

const BLOCK_RULES: Readonly<Record<string, BlockKind>> = {
	repeat: "repeat",
	while: "while",
	procedure: "procedure",
	program: "program",
};

const BLOCK_ROLES: ReadonlySet<Expectation> = new Set([
	"REPEAT",
	"WHILE",
	"PROC",
] satisfies Role[]);

const STATEMENT_START: ReadonlySet<Expectation> = new Set([
	"UP",
	"DOWN",
	"LEFT",
	"RIGHT",
	"IF",
	"REPEAT",
	"WHILE",
	"name",
] satisfies Expectation[]);

const ROLE_SET: ReadonlySet<string> = new Set(ROLES);

function toDiagnostic(
	error: IRecognitionException,
	tokens: readonly IToken[],
): Diagnostic {
	const token = error.token;
	const found = expectation(token.tokenType);
	const expected = JSON.parse(error.message) as Expectation[];
	const atEof = found === "end of file";
	const previous = atEof ? tokens.at(-1) : tokens[tokens.indexOf(token) - 1];
	const blockRule = error.context.ruleStack.findLast(
		(rule) => rule in BLOCK_RULES,
	);
	const block =
		blockRule === undefined
			? "program"
			: (BLOCK_RULES[blockRule] ?? "program");
	// At end of file the token has no position; point just after the last real token.
	const range = !atEof
		? tokenRange(token)
		: previous === undefined
			? { start: START, end: START }
			: previous.tokenType === Newline
				? atLineStart(previous)
				: endOf(tokenRange(previous));
	// Line breaks and the end of file have no useful text to quote.
	const text = found === "newline" || atEof ? "" : token.image;

	if (error.name === "NotAllInputParsedException") {
		const sameLine =
			previous?.tokenType === Keyword.END &&
			previous.endLine === token.startLine;
		// `END REPEAT` (or similar) where the program's END was meant.
		if (sameLine && BLOCK_ROLES.has(found)) {
			return {
				code: "mismatched-end",
				block: "program",
				text: `${previous.image} ${token.image}`,
				range: tokenRange(previous, token),
			};
		}
		if (sameLine)
			return { code: "trailing-text", text: token.image, range };
		return { code: "code-after-end", range };
	}
	if (expected.includes("BEGIN")) return { code: "missing-begin", range };
	// The file ends right after a procedure: the main program is missing.
	if (
		atEof &&
		block === "procedure" &&
		previous?.tokenType === Keyword.PROC &&
		expected.includes("newline")
	) {
		return { code: "missing-begin", range };
	}
	if (atEof) return { code: "missing-end", block, range };

	const only = expected.length === 1 ? expected[0] : undefined;
	if (only === "newline")
		return { code: "trailing-text", text: token.image, range };
	if (only === "name" && ROLE_SET.has(found)) {
		return {
			code: "reserved-word",
			role: found as Role,
			text: token.image,
			range,
		};
	}
	if (
		only !== undefined &&
		BLOCK_ROLES.has(only) &&
		previous?.tokenType === Keyword.END
	) {
		const text =
			found === "newline"
				? previous.image
				: `${previous.image} ${token.image}`;
		const end =
			found === "newline"
				? tokenRange(previous)
				: tokenRange(previous, token);
		return { code: "mismatched-end", block, text, range: end };
	}
	// The block ended (no statement can start with this token) but the closer is wrong.
	if (only === "END" && found === "PROC")
		return { code: "misplaced-procedure", range };
	// BEGIN while a procedure (or loop) is still open: its end marker is missing.
	if (only === "END" && found === "BEGIN" && block !== "program")
		return { code: "missing-end", block, range };
	if (only === "END" && !STATEMENT_START.has(found)) {
		return { code: "invalid-statement", text: token.image, range };
	}
	return { code: "unexpected", expected, found, text, range };
}

const START = { line: 1, column: 1, offset: 0 } as const;

/** The start of the line after a line break. */
function atLineStart(newline: IToken): Range {
	const start = {
		line: (newline.startLine ?? 0) + 1,
		column: 1,
		offset: (newline.endOffset ?? 0) + 1,
	};
	return { start, end: start };
}

function endOf(range: Range): Range {
	return { start: range.end, end: range.end };
}
