/**
 * Runs every program in `corpus/`. Each `name.antp` holds the source and
 * `name.json` the expectation: the final grid, and the runtime error if the
 * run fails.
 *
 * Grids are drawn as rows of text: `@` is the ant, `.` an empty cell and any
 * other character an object. Rows may be short, and missing rows are empty.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, test } from "vitest";
import { parse, type Direction, type Language } from "@repo/ant-grammar";
import {
	GRID_SIZE,
	runProgram,
	type GridObject,
	type Point,
	type RunOptions,
	type World,
} from "../src/index.ts";

interface Grid {
	readonly facing: Direction;
	readonly grid: readonly string[];
}

interface Expectation {
	readonly description: string;
	readonly language: Language;
	readonly spec?: string;
	readonly start?: Grid;
	readonly options?: Omit<RunOptions, "world">;
	readonly end: Grid;
	readonly error?: { code: string; line: number; column: number } & Record<
		string,
		unknown
	>;
	readonly steps?: number;
}

const root = join(import.meta.dirname, "corpus");

function* sources(dir: string): Generator<string> {
	for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
		a.name.localeCompare(b.name),
	)) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) yield* sources(path);
		else if (entry.name.endsWith(".antp")) yield path;
	}
}

function toWorld({ facing, grid }: Grid): World {
	let ant: Point | undefined;
	const objects: GridObject[] = [];
	grid.forEach((row, i) =>
		Array.from(row).forEach((char, j) => {
			const cell = { x: j + 1, y: i + 1 };
			if (char === "@") ant = cell;
			else if (char !== ".") objects.push({ ...cell, char });
		}),
	);
	if (ant === undefined) throw new Error("grid has no ant");
	return { ant, facing, objects };
}

/** The grid drawn as in the corpus, with trailing empty cells and rows dropped. */
function toGrid(world: World): Grid {
	const rows = Array.from({ length: GRID_SIZE }, () =>
		Array<string>(GRID_SIZE).fill("."),
	);
	for (const o of world.objects) rows[o.y - 1]![o.x - 1] = o.char;
	rows[world.ant.y - 1]![world.ant.x - 1] = "@";
	const grid = rows.map((r) => r.join("").replace(/\.+$/, ""));
	while (grid.at(-1) === "") grid.pop();
	return { facing: world.facing, grid };
}

describe("corpus", () => {
	for (const path of sources(root)) {
		const name = relative(root, path).replace(/\.antp$/, "");
		const expected: Expectation = JSON.parse(
			readFileSync(path.replace(/\.antp$/, ".json"), "utf8"),
		);
		const title = `${name}: ${expected.description}${expected.spec ? ` (${expected.spec})` : ""}`;
		test(title, () => {
			const source = readFileSync(path, "utf8");
			const { program, diagnostics } = parse(source, {
				language: expected.language,
			});
			expect(diagnostics).toEqual([]);
			const result = runProgram(program!, {
				...expected.options,
				...(expected.start && { world: toWorld(expected.start) }),
			});
			expect(toGrid(result.world)).toEqual(expected.end);
			if (expected.error) {
				expect(result.status).toBe("failed");
				const { range, ...rest } = result.error!;
				expect({
					...rest,
					line: range.start.line,
					column: range.start.column,
				}).toMatchObject(expected.error);
			} else {
				expect(result.error).toBeUndefined();
				expect(result.status).toBe("finished");
			}
			if (expected.steps !== undefined)
				expect(result.steps).toBe(expected.steps);
		});
	}
});
