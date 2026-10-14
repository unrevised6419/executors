import { describe, expect, test } from "vitest";
import { LANGUAGES, parse } from "@repo/ant-grammar";
import { diagnosticMessage, runtimeErrorMessage } from "@/i18n/errors";
import { MESSAGES } from "@/i18n/messages";

const range = {
	start: { line: 2, column: 1, offset: 8 },
	end: { line: 2, column: 4, offset: 11 },
};

describe("diagnosticMessage", () => {
	test("is formatMessage in English", () => {
		const { diagnostics } = parse("BEGIN\nUP\n", { language: "en" });
		expect(diagnosticMessage(diagnostics[0]!, "en")).toBe("Missing END.");
	});

	test("translates with the language's keywords", () => {
		const { diagnostics } = parse("INCEPUT\nSUS\n", { language: "ro" });
		expect(diagnosticMessage(diagnostics[0]!, "ro")).toBe(
			"Lipsește SFIRSIT.",
		);
		const ru = parse("НАЧАЛО\nВВЕРХ\n", { language: "ru" });
		expect(diagnosticMessage(ru.diagnostics[0]!, "ru")).toBe(
			"Не хватает КОНЕЦ.",
		);
	});
});

describe("runtimeErrorMessage", () => {
	test("names the pushed characters", () => {
		const error = {
			code: "push-blocked",
			object: { x: 2, y: 1, char: "a" },
			blocker: { x: 3, y: 1, char: "b" },
			range,
		} as const;
		expect(runtimeErrorMessage(error, "en")).toBe(
			'"a" cannot be pushed: "b" is behind it.',
		);
		expect(runtimeErrorMessage(error, "ro")).toBe(
			"„a” nu poate fi împins: în spatele lui este „b”.",
		);
	});
});

test("every language has every message", () => {
	const keys = Object.keys(MESSAGES.en).sort();
	for (const language of LANGUAGES)
		expect(Object.keys(MESSAGES[language]).sort()).toEqual(keys);
});
