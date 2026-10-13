import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { parse } from "@repo/ant-grammar";
import { checkWorld, runProgram, type GridObject } from "@repo/ant-runtime";
import { checkGoal, START, TASKS } from "../src/index.ts";

const letters = (objects: readonly GridObject[]) =>
	objects
		.map((o) => o.char)
		.sort()
		.join("");

describe("worksheet", () => {
	test("has 24 tasks, numbered in order", () => {
		expect(TASKS.map((task) => task.number)).toEqual(
			Array.from({ length: 24 }, (_, i) => i + 1),
		);
	});

	test("starts from a valid world", () => {
		expect(checkWorld(START)).toEqual([]);
		expect(letters(START.objects)).toBe("aaaammtt");
	});

	test.each(TASKS)("task $number places the same eight letters", (task) => {
		expect(letters(task.goal)).toBe(letters(START.objects));
		// The ant's start may hold a letter at the end, so stand it in the middle.
		const end = { ...START, ant: { x: 5, y: 5 }, objects: task.goal };
		expect(checkWorld(end)).toEqual([]);
	});
});

describe("solutions", () => {
	test.each(TASKS)("sarcina-$number.antp solves task $number", (task) => {
		const file = `sarcina-${String(task.number).padStart(2, "0")}.antp`;
		const source = readFileSync(
			join(import.meta.dirname, "..", "solutions", file),
			"utf8",
		);
		const { program, diagnostics } = parse(source, { language: "ro" });
		expect(diagnostics).toEqual([]);
		const result = runProgram(program!, { world: START });
		expect(result.error).toBeUndefined();
		expect(checkGoal(result.world, task.goal)).toEqual({
			solved: true,
			missing: [],
			misplaced: [],
		});
	});
});

describe("checkGoal", () => {
	const goal = TASKS[0]!.goal;

	test("is not solved at the start", () => {
		const check = checkGoal(START, goal);
		expect(check.solved).toBe(false);
		expect(check.missing).toHaveLength(8);
		expect(check.misplaced).toHaveLength(8);
	});

	test("ignores the ant", () => {
		const world = { ...START, ant: { x: 5, y: 5 }, objects: goal };
		expect(checkGoal(world, goal).solved).toBe(true);
	});

	test("tells letters apart", () => {
		const swapped = goal.map((o) =>
			o.x === 1 && o.y === 7
				? { ...o, char: "a" }
				: o.x === 1 && o.y === 8
					? { ...o, char: "m" }
					: o,
		);
		const check = checkGoal({ ...START, objects: swapped }, goal);
		expect(check.solved).toBe(false);
		expect(check.missing).toEqual([
			{ x: 1, y: 7, char: "m" },
			{ x: 1, y: 8, char: "a" },
		]);
		expect(check.misplaced).toEqual([
			{ x: 1, y: 7, char: "a" },
			{ x: 1, y: 8, char: "m" },
		]);
	});
});
