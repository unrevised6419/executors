/**
 * Reads and writes the original program's `.ant` files (ant-spec §7): a
 * starting world and the program text, as single-byte text with CRLF line
 * endings.
 *
 * ```
 * Ant executor file
 * [table description]
 * 1 1          ← ant column and row
 * 1            ← facing: 1 down, 2 left, 3 up, 4 right
 * 1 1 *        ← one line per non-empty cell, row by row; `*` is the ant
 * 3 1 A
 * 666 666 *    ← terminator
 * INCEPUT      ← the program, verbatim
 * SFIRSIT
 * ```
 */

import {
	checkWorld,
	type GridObject,
	type Point,
	type World,
	type WorldProblem,
} from "@repo/ant-runtime";

/**
 * The text encodings files are read and written in. The original wrote the
 * system code page: windows-1250 on Romanian systems and windows-1251 on
 * Russian ones.
 */
export type AntFileEncoding = "windows-1250" | "windows-1251" | "utf-8";

export const DEFAULT_ENCODING: AntFileEncoding = "windows-1250";

export interface AntFile {
	readonly world: World;
	/** The program text, with `\n` line endings. */
	readonly source: string;
}

export interface AntFileOptions {
	/** Default: windows-1250. */
	readonly encoding?: AntFileEncoding;
}

export type AntFileErrorCode =
	| "missing-header"
	| "invalid-position"
	| "invalid-facing"
	| "invalid-cell"
	| "missing-terminator"
	| "invalid-world";

/** Why a file could not be read. `line` is 1-based. */
export class AntFileError extends Error {
	override readonly name = "AntFileError";

	constructor(
		readonly code: AntFileErrorCode,
		readonly line: number,
		message: string,
		/** For `invalid-world`. */
		readonly problem?: WorldProblem,
	) {
		super(`Line ${line}: ${message}`);
	}
}

const HEADER = ["Ant executor file", "[table description]"] as const;
const TERMINATOR = 666;
const ANT_CELL = "*";

const FACINGS: readonly World["facing"][] = ["down", "left", "up", "right"];

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/**
 * Reads a `.ant` file. Like the original, it ignores the two header lines and
 * the `*` cell that marks the ant; everything else is checked.
 *
 * @throws AntFileError when the file is malformed or its world is invalid.
 */
export function readAntFile(
	input: Uint8Array | string,
	options: AntFileOptions = {},
): AntFile {
	const text =
		typeof input === "string"
			? input
			: new TextDecoder(options.encoding ?? DEFAULT_ENCODING).decode(
					input,
				);
	const lines = text.split(/\r\n|\r|\n/);

	if (lines.length < 4) {
		throw new AntFileError(
			"missing-header",
			lines.length + 1,
			"The file ends before the ant's position and facing.",
		);
	}

	const position = /^\s*(\d+)\s+(\d+)\s*$/.exec(lines[2]!);
	if (!position) {
		throw new AntFileError(
			"invalid-position",
			3,
			`Expected the ant's column and row, but found "${lines[2]}".`,
		);
	}
	const ant: Point = { x: Number(position[1]), y: Number(position[2]) };

	const facingCode = /^\s*([1-4])\s*$/.exec(lines[3]!);
	if (!facingCode) {
		throw new AntFileError(
			"invalid-facing",
			4,
			`Expected the ant's facing (1 down, 2 left, 3 up, 4 right), but found "${lines[3]}".`,
		);
	}
	const facing = FACINGS[Number(facingCode[1]) - 1]!;

	const objects: GridObject[] = [];
	const objectLines = new Map<GridObject, number>();
	let index = 4;
	for (; ; index++) {
		if (index >= lines.length) {
			throw new AntFileError(
				"missing-terminator",
				index + 1,
				`The file ends before the "${TERMINATOR} ${TERMINATOR} ${ANT_CELL}" line.`,
			);
		}
		const line = lines[index]!;
		const cell = /^\s*(\d+)\s+(\d+) (.*)$/u.exec(line);
		if (!cell) {
			throw new AntFileError(
				"invalid-cell",
				index + 1,
				`Expected a column, a row and a character, but found "${line}".`,
			);
		}
		if (Number(cell[1]) === TERMINATOR) break;
		const char = cell[3]!;
		if (char === ANT_CELL) continue;
		if ([...graphemes.segment(char)].length !== 1) {
			throw new AntFileError(
				"invalid-cell",
				index + 1,
				`Expected one character after the column and row, but found "${char}".`,
			);
		}
		const object: GridObject = {
			x: Number(cell[1]),
			y: Number(cell[2]),
			char,
		};
		objects.push(object);
		objectLines.set(object, index + 1);
	}

	const world: World = { ant, facing, objects: sortObjects(objects) };
	const [problem] = checkWorld(world);
	if (problem) {
		const line = "object" in problem ? objectLines.get(problem.object)! : 3;
		throw new AntFileError(
			"invalid-world",
			line,
			describe(problem),
			problem,
		);
	}

	const program = lines.slice(index + 1);
	// A final line break ends the last line; it does not start a new one.
	if (program.length > 0 && program.at(-1) === "") program.pop();
	return { world, source: program.join("\n") };
}

/** Formats a `.ant` file as text, with CRLF line endings. */
export function formatAntFile(file: AntFile): string {
	const problems = checkWorld(file.world);
	if (problems.length > 0) {
		throw new RangeError(
			`Invalid world: ${problems.map(describe).join(" ")}`,
		);
	}
	const { world } = file;
	const star = world.objects.find((object) => object.char === ANT_CELL);
	if (star) {
		throw new RangeError(
			`${at(star)}: "${ANT_CELL}" marks the ant in .ant files and cannot be saved as an object.`,
		);
	}

	const cells = sortObjects([
		...world.objects,
		{ ...world.ant, char: ANT_CELL },
	]);
	const lines = [
		...HEADER,
		`${world.ant.x} ${world.ant.y}`,
		String(FACINGS.indexOf(world.facing) + 1),
		...cells.map((cell) => `${cell.x} ${cell.y} ${cell.char}`),
		`${TERMINATOR} ${TERMINATOR} ${ANT_CELL}`,
		file.source.replace(/\r\n|\r|\n/g, "\r\n"),
	];
	return lines.join("\r\n");
}

/**
 * Writes a `.ant` file that the original program can open.
 *
 * @throws RangeError when the world is invalid, holds a `*` object, or has a
 * character the encoding cannot represent.
 */
export function writeAntFile(
	file: AntFile,
	options: AntFileOptions = {},
): Uint8Array {
	const encoding = options.encoding ?? DEFAULT_ENCODING;
	const text = formatAntFile(file);
	if (encoding === "utf-8") return new TextEncoder().encode(text);

	const table = byteTable(encoding);
	const bytes = new Uint8Array(text.length);
	let length = 0;
	for (const char of text) {
		const byte = table.get(char);
		if (byte === undefined) {
			throw new RangeError(`"${char}" cannot be written in ${encoding}.`);
		}
		bytes[length++] = byte;
	}
	return bytes.slice(0, length);
}

const byteTables = new Map<AntFileEncoding, Map<string, number>>();

/** Maps each character of a single-byte encoding to its byte. */
function byteTable(encoding: AntFileEncoding): Map<string, number> {
	let table = byteTables.get(encoding);
	if (!table) {
		table = new Map();
		const decoder = new TextDecoder(encoding);
		for (let byte = 0; byte < 256; byte++) {
			const char = decoder.decode(Uint8Array.of(byte));
			if (char !== "�" && !table.has(char)) table.set(char, byte);
		}
		byteTables.set(encoding, table);
	}
	return table;
}

function sortObjects(objects: readonly GridObject[]): GridObject[] {
	return [...objects].sort((a, b) => a.y - b.y || a.x - b.x);
}

function at(p: Point): string {
	return `Column ${p.x}, row ${p.y}`;
}

function describe(problem: WorldProblem): string {
	switch (problem.code) {
		case "ant-outside-grid":
			return `The ant (column ${problem.ant.x}, row ${problem.ant.y}) is outside the grid.`;
		case "invalid-facing":
			return `"${problem.facing}" is not a direction.`;
		case "object-outside-grid":
			return `${at(problem.object)} is outside the grid.`;
		case "invalid-object":
			return `${at(problem.object)}: "${problem.object.char}" is not a single visible character.`;
		case "object-under-ant":
			return `${at(problem.object)}: "${problem.object.char}" stands on the ant.`;
		case "duplicate-cell":
			return `${at(problem.object)} is listed twice.`;
	}
}
