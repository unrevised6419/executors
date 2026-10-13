import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { parse, type Language } from "@repo/ant-grammar";
import { runProgram } from "@repo/ant-runtime";
import {
	AntFileError,
	formatAntFile,
	readAntFile,
	writeAntFile,
	type AntFile,
	type AntFileEncoding,
} from "../src/index.ts";

const fixture = (name: string) =>
	readFileSync(join(import.meta.dirname, "fixtures", name));

const lines = (...rows: string[]) => rows.join("\r\n");

const HEADER = ["Ant executor file", "[table description]"];

describe("readAntFile", () => {
	test("reads the example of ant-spec §7", () => {
		expect(readAntFile(fixture("spec-example.ant"))).toEqual({
			world: {
				ant: { x: 1, y: 1 },
				facing: "down",
				objects: [{ x: 3, y: 1, char: "A" }],
			},
			source: "INCEPUT\nDREAPTA\nSFIRSIT",
		});
	});

	test("decodes windows-1250 by default", () => {
		const { world, source } = readAntFile(fixture("romanian.ant"));
		expect(world).toEqual({
			ant: { x: 2, y: 3 },
			facing: "right",
			objects: [
				{ x: 5, y: 1, char: "Ş" },
				{ x: 4, y: 3, char: "ă" },
				{ x: 10, y: 10, char: "#" },
			],
		});
		expect(source.split("\n")[1]).toBe("PROCEDURA Împinge");
	});

	test("decodes windows-1251 when asked", () => {
		const { world, source } = readAntFile(fixture("russian.ant"), {
			encoding: "windows-1251",
		});
		expect(world.objects).toEqual([{ x: 1, y: 2, char: "Ж" }]);
		expect(source).toBe("НАЧАЛО\n  ВВЕРХ\nКОНЕЦ");
	});

	test("reads text, LF line endings and any header", () => {
		const file = readAntFile("x\ny\n4 5\n2\n666 1 ?\nBEGIN\nEND\n");
		expect(file).toEqual({
			world: { ant: { x: 4, y: 5 }, facing: "left", objects: [] },
			source: "BEGIN\nEND",
		});
	});

	test("keeps blank lines and indentation of the program", () => {
		const { source } = readAntFile(
			lines(...HEADER, "1 1", "1", "666 666 *", "", "  A", "", "B", ""),
		);
		expect(source).toBe("\n  A\n\nB");
	});

	test("reads a file without a program", () => {
		expect(
			readAntFile(lines(...HEADER, "1 1", "3", "666 666 *")).source,
		).toBe("");
	});

	test("ignores the * cell, wherever it is", () => {
		const { world } = readAntFile(
			lines(...HEADER, "1 1", "1", "7 7 *", "666 666 *"),
		);
		expect(world.objects).toEqual([]);
	});

	test("sorts objects by row, then column", () => {
		const { world } = readAntFile(
			lines(
				...HEADER,
				"1 1",
				"1",
				"2 9 b",
				"9 2 a",
				"3 9 c",
				"666 666 *",
			),
		);
		expect(world.objects.map((o) => o.char).join("")).toBe("abc");
	});

	test.each<[string, string[], string, number]>([
		["a short file", ["Ant executor file"], "missing-header", 2],
		["a bad position", [...HEADER, "1", "1"], "invalid-position", 3],
		["a bad facing", [...HEADER, "1 1", "5"], "invalid-facing", 4],
		[
			"a cell without a character",
			[...HEADER, "1 1", "1", "2 2 "],
			"invalid-cell",
			5,
		],
		[
			"a cell with two characters",
			[...HEADER, "1 1", "1", "2 2 ab"],
			"invalid-cell",
			5,
		],
		[
			"a cell that is not a cell",
			[...HEADER, "1 1", "1", "INCEPUT"],
			"invalid-cell",
			5,
		],
		[
			"no terminator",
			[...HEADER, "1 1", "1", "2 2 a"],
			"missing-terminator",
			6,
		],
		[
			"the ant outside the grid",
			[...HEADER, "11 1", "1", "666 666 *"],
			"invalid-world",
			3,
		],
		[
			"an object outside the grid",
			[...HEADER, "1 1", "1", "2 2 a", "0 3 b", "666 666 *"],
			"invalid-world",
			6,
		],
		[
			"an object on the ant",
			[...HEADER, "1 1", "1", "1 1 a", "666 666 *"],
			"invalid-world",
			5,
		],
		[
			"a cell listed twice",
			[...HEADER, "1 1", "1", "2 2 a", "2 2 b", "666 666 *"],
			"invalid-world",
			6,
		],
	])("rejects %s", (_, rows, code, line) => {
		const read = () => readAntFile(lines(...rows));
		expect(read).toThrow(AntFileError);
		expect(read).toThrow(expect.objectContaining({ code, line }));
	});

	test("explains what is wrong", () => {
		expect(() =>
			readAntFile(
				lines(...HEADER, "1 1", "1", "2 2 a", "2 2 b", "666 666 *"),
			),
		).toThrow("Line 6: Column 2, row 2 is listed twice.");
	});
});

describe("writeAntFile", () => {
	const file: AntFile = {
		world: {
			ant: { x: 2, y: 3 },
			facing: "up",
			objects: [
				{ x: 5, y: 1, char: "Ş" },
				{ x: 4, y: 3, char: "ă" },
			],
		},
		source: "ÎNCEPUT\n  SUS\nSFÎRŞIT",
	};

	test("formats the original's layout", () => {
		expect(formatAntFile(file)).toBe(
			lines(
				...HEADER,
				"2 3",
				"3",
				"5 1 Ş",
				"2 3 *",
				"4 3 ă",
				"666 666 *",
				"ÎNCEPUT",
				"  SUS",
				"SFÎRŞIT",
			),
		);
	});

	test("writes the fixtures byte for byte", () => {
		for (const [name, encoding] of [
			["spec-example.ant", "windows-1250"],
			["romanian.ant", "windows-1250"],
			["russian.ant", "windows-1251"],
		] as const) {
			const bytes = fixture(name);
			const read = readAntFile(bytes, { encoding });
			expect(writeAntFile(read, { encoding })).toEqual(
				new Uint8Array(bytes),
			);
		}
	});

	test.each<AntFileEncoding>(["windows-1250", "utf-8"])(
		"round-trips in %s",
		(encoding) => {
			expect(
				readAntFile(writeAntFile(file, { encoding }), { encoding }),
			).toEqual(file);
		},
	);

	test("rejects characters the encoding lacks", () => {
		const emoji = { ...file, source: "BEGIN 🐜\nEND" };
		expect(() => writeAntFile(emoji)).toThrow(
			'"🐜" cannot be written in windows-1250.',
		);
		expect(
			readAntFile(writeAntFile(emoji, { encoding: "utf-8" }), {
				encoding: "utf-8",
			}),
		).toEqual(emoji);
	});

	test("rejects * objects, which would read back as the ant", () => {
		const star = {
			...file,
			world: { ...file.world, objects: [{ x: 1, y: 1, char: "*" }] },
		};
		expect(() => writeAntFile(star)).toThrow(
			'Column 1, row 1: "*" marks the ant in .ant files and cannot be saved as an object.',
		);
	});

	test("rejects invalid worlds", () => {
		const outside = {
			...file,
			world: { ...file.world, ant: { x: 0, y: 1 } },
		};
		expect(() => writeAntFile(outside)).toThrow(RangeError);
	});
});

describe("running a file", () => {
	test.each<[string, Language, AntFileEncoding, object]>([
		[
			"spec-example.ant",
			"ro",
			"windows-1250",
			{
				ant: { x: 2, y: 1 },
				facing: "right",
				objects: [{ x: 3, y: 1, char: "A" }],
			},
		],
		[
			"romanian.ant",
			"ro",
			"windows-1250",
			{
				ant: { x: 4, y: 3 },
				facing: "right",
				objects: [
					{ x: 5, y: 1, char: "Ş" },
					{ x: 5, y: 3, char: "ă" },
					{ x: 10, y: 10, char: "#" },
				],
			},
		],
		[
			"russian.ant",
			"ru",
			"windows-1251",
			{
				ant: { x: 1, y: 2 },
				facing: "up",
				objects: [{ x: 1, y: 1, char: "Ж" }],
			},
		],
	])("%s", (name, language, encoding, end) => {
		const { world, source } = readAntFile(fixture(name), { encoding });
		const { program, diagnostics } = parse(source, { language });
		expect(diagnostics).toEqual([]);
		const result = runProgram(program!, { world });
		expect(result.status).toBe("finished");
		expect(result.world).toEqual(end);
	});
});
