import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { AntFileError } from "@repo/ant-file";
import { MESSAGES } from "@/i18n/messages";
import {
	defaultEncoding,
	openProgramFile,
	saveFileName,
} from "@/ide/files/files";
import { newExercise } from "@/storage/exercise";

const fixture = (name: string) =>
	new Uint8Array(
		readFileSync(
			join(
				import.meta.dirname,
				"../../../packages/ant-file/tests/fixtures",
				name,
			),
		),
	);

test("defaultEncoding follows the original's code pages", () => {
	expect(defaultEncoding("ro")).toBe("windows-1250");
	expect(defaultEncoding("en")).toBe("windows-1250");
	expect(defaultEncoding("ru")).toBe("windows-1251");
});

describe("openProgramFile", () => {
	test("reads an .ant file's world and program", () => {
		const file = openProgramFile(
			"x.ANT",
			fixture("spec-example.ant"),
			"windows-1250",
		);
		expect(file.source).toBe("INCEPUT\nDREAPTA\nSFIRSIT");
		expect(file.start?.objects).toEqual([{ x: 3, y: 1, char: "A" }]);
	});

	test("reads an .antp file as UTF-8 program text, keeping the world", () => {
		const bytes = new TextEncoder().encode("ÎNCEPUT\r\nSUS\r\nSFÎRȘIT\r\n");
		expect(openProgramFile("p.antp", bytes, "windows-1250")).toEqual({
			source: "ÎNCEPUT\nSUS\nSFÎRȘIT\n",
		});
	});

	test("throws AntFileError for a malformed .ant file", () => {
		const bytes = new TextEncoder().encode("Ant executor file\r\n");
		expect(() => openProgramFile("bad.ant", bytes, "windows-1250")).toThrow(
			AntFileError,
		);
	});
});

test("saveFileName", () => {
	const t = MESSAGES.ro;
	expect(
		saveFileName(newExercise({ language: "ro", taskNumber: 4 }), t),
	).toBe("sarcina-4.ant");
	expect(
		saveFileName(
			newExercise({ language: "ro", title: "Prima mea / ok" }),
			t,
		),
	).toBe("prima-mea-ok.ant");
	expect(saveFileName(newExercise({ language: "ro" }), t)).toBe(
		"program-nou.ant",
	);
});
