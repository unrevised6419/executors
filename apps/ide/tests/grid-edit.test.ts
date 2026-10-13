import { describe, expect, test } from "vitest";
import type { World } from "@repo/ant-runtime";
import { clearCell, isCellChar, placeObject, rotate } from "@/ide/grid/edit";

const world: World = {
	ant: { x: 1, y: 1 },
	facing: "down",
	objects: [{ x: 5, y: 5, char: "m" }],
};

describe("isCellChar", () => {
	test.each(["a", "Ş", "ж", "🐜", "👩‍👩‍👧", "é", "#"])("accepts %s", (c) =>
		expect(isCellChar(c)).toBe(true),
	);
	test.each(["", " ", "*", "ab", "\t"])("refuses %j", (c) =>
		expect(isCellChar(c)).toBe(false),
	);
});

describe("placeObject", () => {
	test("places a character and keeps objects sorted", () => {
		expect(placeObject(world, { x: 2, y: 1 }, "a").objects).toEqual([
			{ x: 2, y: 1, char: "a" },
			{ x: 5, y: 5, char: "m" },
		]);
	});

	test("leaves the ant's cell, taken cells and invalid characters alone", () => {
		expect(placeObject(world, { x: 1, y: 1 }, "a")).toBe(world);
		expect(placeObject(world, { x: 5, y: 5 }, "a")).toBe(world);
		expect(placeObject(world, { x: 2, y: 2 }, "*")).toBe(world);
		expect(placeObject(world, { x: 2, y: 2 }, "ab")).toBe(world);
	});
});

test("clearCell removes the object", () => {
	expect(clearCell(world, { x: 5, y: 5 }).objects).toEqual([]);
	expect(clearCell(world, { x: 6, y: 6 })).toBe(world);
});

test("rotate turns counter-clockwise", () => {
	const facings: string[] = [];
	let w: World = { ...world, facing: "right" };
	for (let i = 0; i < 4; i++) {
		w = rotate(w);
		facings.push(w.facing);
	}
	expect(facings).toEqual(["up", "left", "down", "right"]);
});
