import { describe, expect, test } from "vitest";
import { moveAnt, sortObjects, type World } from "../src/index.ts";

const at = (
	x: number,
	y: number,
	facing: World["facing"],
	objects: World["objects"] = [],
): World => ({ ant: { x, y }, facing, objects });

describe("moveAnt", () => {
	test("turns the ant and steps one cell", () => {
		expect(moveAnt(at(2, 2, "down"), "right")).toEqual({
			world: at(3, 2, "right"),
			outcome: { ok: true, to: { x: 3, y: 2 }, push: undefined },
		});
	});

	test("turns but stays at a wall", () => {
		expect(moveAnt(at(1, 1, "down"), "up")).toEqual({
			world: at(1, 1, "up"),
			outcome: { ok: false, code: "wall" },
		});
	});

	test("pushes an object and keeps objects sorted", () => {
		const start = at(2, 1, "down", [
			{ x: 2, y: 2, char: "a" },
			{ x: 1, y: 3, char: "c" },
		]);
		expect(moveAnt(start, "down")).toEqual({
			world: at(2, 2, "down", [
				{ x: 1, y: 3, char: "c" },
				{ x: 2, y: 3, char: "a" },
			]),
			outcome: {
				ok: true,
				to: { x: 2, y: 2 },
				push: { char: "a", from: { x: 2, y: 2 }, to: { x: 2, y: 3 } },
			},
		});
	});

	test("refuses to push an object off the grid", () => {
		const start = at(1, 9, "up", [{ x: 1, y: 10, char: "a" }]);
		expect(moveAnt(start, "down")).toEqual({
			world: { ...start, facing: "down" },
			outcome: {
				ok: false,
				code: "push-off-grid",
				object: { x: 1, y: 10, char: "a" },
			},
		});
	});

	test("refuses to push two objects", () => {
		const start = at(1, 1, "down", [
			{ x: 2, y: 1, char: "a" },
			{ x: 3, y: 1, char: "b" },
		]);
		expect(moveAnt(start, "right").outcome).toEqual({
			ok: false,
			code: "push-blocked",
			object: { x: 2, y: 1, char: "a" },
			blocker: { x: 3, y: 1, char: "b" },
		});
	});

	test("does not change its input", () => {
		const start = at(2, 1, "down", [{ x: 2, y: 2, char: "a" }]);
		const copy = structuredClone(start);
		moveAnt(start, "down");
		expect(start).toEqual(copy);
	});
});

test("sortObjects orders by row, then column", () => {
	expect(
		sortObjects([
			{ x: 3, y: 2, char: "c" },
			{ x: 9, y: 1, char: "b" },
			{ x: 1, y: 2, char: "a" },
		]).map((o) => o.char),
	).toEqual(["b", "a", "c"]);
});
