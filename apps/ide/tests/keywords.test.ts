import { describe, expect, test } from "vitest";
import { KEYWORD_SETS } from "@repo/ant-grammar";
import {
	buttonLabel,
	KEYWORD_BUTTONS,
	keywordInsertion,
} from "@/ide/keywords/insert";

const ro = KEYWORD_SETS.ro;

describe("keywordInsertion (ant-spec §10)", () => {
	test("BEGIN and END insert a line above the caret line", () => {
		expect(keywordInsertion("BEGIN", ro, "SUS", 3)).toEqual({
			line: 3,
			column: 1,
			text: "INCEPUT\n",
			caret: { line: 4, column: 4 },
		});
		expect(keywordInsertion("END", ro, "", 1).text).toBe("SFIRSIT\n");
	});

	test("other keywords append the keyword and a space to the line", () => {
		expect(keywordInsertion("REPEAT", ro, "", 2)).toEqual({
			line: 2,
			column: 1,
			text: "REPETA ",
			caret: { line: 2, column: 8 },
		});
		expect(keywordInsertion("TIMES", ro, "REPETA 3 ", 2).text).toBe("ORI ");
	});

	test("a space separates the keyword from a word before it", () => {
		expect(keywordInsertion("TIMES", ro, "REPETA 3", 2)).toMatchObject({
			column: 9,
			text: " ORI ",
		});
	});

	test("DO has no trailing space and END... appends END", () => {
		expect(keywordInsertion("DO", ro, "CIT E_MARGINE ", 1).text).toBe(
			"EXECUTA",
		);
		expect(keywordInsertion("END_BLOCK", ro, "", 1).text).toBe("SFIRSIT ");
	});
});

test("there are 17 buttons, labelled in the program's language", () => {
	expect(KEYWORD_BUTTONS).toHaveLength(17);
	expect(buttonLabel("END_BLOCK", KEYWORD_SETS.en)).toBe("END...");
	expect(buttonLabel("LEFT", KEYWORD_SETS.ru)).toBe("ВЛЕВО");
});
