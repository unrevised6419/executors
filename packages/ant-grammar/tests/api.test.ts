import { describe, expect, test } from "vitest";
import {
	createMonacoTokensProvider,
	formatMessage,
	highlightLine,
	KEYWORD_SETS,
	keywordRole,
	parse,
	sameWord,
} from "../src/index.ts";

describe("sameWord", () => {
	test.each([
		["SFIRSIT", "sfîrșit"],
		["s", "ş"],
		["s", "ș"],
		["ț", "ţ"],
		["е", "ё"],
		["Față", "FATA"],
	])("%s = %s", (a, b) => expect(sameWord(a, b)).toBe(true));

	test.each([
		["и", "й"],
		["A_B", "AB"],
		["SFIRSIT", "SFARSIT"],
	])("%s ≠ %s", (a, b) => expect(sameWord(a, b)).toBe(false));
});

describe("keywordRole", () => {
	test("finds roles in the program's language only", () => {
		expect(keywordRole(KEYWORD_SETS.ro, "Stînga")).toBe("LEFT");
		expect(keywordRole(KEYWORD_SETS.ro, "STÂNGA")).toBe("LEFT");
		expect(keywordRole(KEYWORD_SETS.ro, "LEFT")).toBeUndefined();
		expect(keywordRole(KEYWORD_SETS.en, "left")).toBe("LEFT");
		expect(keywordRole(KEYWORD_SETS.ru, "влево")).toBe("LEFT");
	});
});

describe("ranges", () => {
	test("are 1-based with an exclusive end", () => {
		const { program } = parse(
			"INCEPUT\n  REPETA 12 ORI\n  DREAPTA\n  SFIRSIT REPETA\nSFIRSIT",
			{ language: "ro" },
		);
		const repeat = program!.body[0]!;
		expect(repeat.range).toEqual({
			start: { line: 2, column: 3, offset: 10 },
			end: { line: 4, column: 17, offset: 50 },
		});
		expect(repeat.kind === "repeat" && repeat.countRange).toEqual({
			start: { line: 2, column: 10, offset: 17 },
			end: { line: 2, column: 12, offset: 19 },
		});
		expect(repeat.kind === "repeat" && repeat.header).toEqual({
			start: { line: 2, column: 3, offset: 10 },
			end: { line: 2, column: 16, offset: 23 },
		});
	});
});

describe("formatMessage", () => {
	const message = (source: string, language: "ro" | "en" = "ro") => {
		const { diagnostics } = parse(source, { language });
		return diagnostics.map((d) => formatMessage(d, KEYWORD_SETS[language]));
	};

	test("spells keywords in the program's language", () => {
		expect(message("INCEPUT\nREPETA 2 ORI\nSFIRSIT CIT\nSFIRSIT")).toEqual([
			'Expected SFIRSIT REPETA, but found "SFIRSIT CIT".',
		]);
		expect(message("BEGIN\nREPEAT 2 TIMES\nEND WHILE\nEND", "en")).toEqual([
			'Expected END REPEAT, but found "END WHILE".',
		]);
	});

	test("lists alternatives", () => {
		expect(message("INCEPUT\nDACA E_MARGINE ATUNCI\nSFIRSIT")).toEqual([
			"Expected SUS, JOS, STINGA, DREAPTA or a procedure name, but found end of line.",
		]);
	});

	test("explains reserved words and duplicates", () => {
		expect(
			message("PROCEDURA Sus\nSFIRSIT PROCEDURA\nINCEPUT\nSFIRSIT"),
		).toEqual([
			'"Sus" is a keyword and cannot be used as a procedure name.',
		]);
		expect(
			message(
				"PROCEDURA A\nSFIRSIT PROCEDURA\nPROCEDURA a\nSFIRSIT PROCEDURA\nINCEPUT\nSFIRSIT",
			),
		).toEqual(['Procedure "a" is already defined on line 1.']);
	});
});

describe("highlightLine", () => {
	test("classifies every token of a line", () => {
		expect(
			highlightLine("  dacă e_margine ATUNCI sus ALTFEL Pas // ok", "ro"),
		).toEqual([
			{ start: 2, length: 4, kind: "keyword" },
			{ start: 7, length: 9, kind: "condition" },
			{ start: 17, length: 6, kind: "keyword" },
			{ start: 24, length: 3, kind: "move" },
			{ start: 28, length: 6, kind: "keyword" },
			{ start: 35, length: 3, kind: "name" },
			{ start: 39, length: 5, kind: "comment" },
		]);
	});

	test("marks numbers and invalid characters", () => {
		expect(highlightLine("REPETA 3 ORI €", "ro")).toEqual([
			{ start: 0, length: 6, kind: "keyword" },
			{ start: 7, length: 1, kind: "number" },
			{ start: 9, length: 3, kind: "keyword" },
			{ start: 13, length: 1, kind: "invalid" },
		]);
	});
});

describe("createMonacoTokensProvider", () => {
	test("covers the line, with default scopes for gaps", () => {
		const provider = createMonacoTokensProvider("en");
		const state = provider.getInitialState();
		expect(provider.tokenize(" up // x", state)).toEqual({
			tokens: [
				{ startIndex: 0, scopes: "" },
				{ startIndex: 1, scopes: "keyword.move" },
				{ startIndex: 3, scopes: "" },
				{ startIndex: 4, scopes: "comment" },
			],
			endState: state,
		});
	});
});
