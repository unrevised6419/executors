/**
 * The grid the ant lives on.
 *
 * Cells are addressed 1-based: `x` is the column (left to right) and `y` the
 * row (top to bottom), as in the original program and its `.ant` files.
 */

import type { Direction } from "@repo/ant-grammar";

export const GRID_SIZE = 10;

export interface Point {
	readonly x: number;
	readonly y: number;
}

/** A character standing in one cell. The ant can push it. */
export interface GridObject extends Point {
	readonly char: string;
}

export interface World {
	readonly ant: Point;
	readonly facing: Direction;
	/** Sorted by row, then column. */
	readonly objects: readonly GridObject[];
}

/** The original's initial state: the ant top-left, facing down, no objects. */
export const INITIAL_WORLD: World = {
	ant: { x: 1, y: 1 },
	facing: "down",
	objects: [],
};

export function inGrid(p: Point): boolean {
	return (
		Number.isInteger(p.x) &&
		Number.isInteger(p.y) &&
		p.x >= 1 &&
		p.x <= GRID_SIZE &&
		p.y >= 1 &&
		p.y <= GRID_SIZE
	);
}

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** An object is exactly one user-perceived character that is not blank. */
export function isObjectChar(char: string): boolean {
	const [first, second] = graphemes.segment(char);
	return first !== undefined && second === undefined && /\S/u.test(char);
}

export type WorldProblem =
	| { readonly code: "ant-outside-grid"; readonly ant: Point }
	| { readonly code: "invalid-facing"; readonly facing: string }
	| { readonly code: "object-outside-grid"; readonly object: GridObject }
	| { readonly code: "invalid-object"; readonly object: GridObject }
	| { readonly code: "object-under-ant"; readonly object: GridObject }
	| { readonly code: "duplicate-cell"; readonly object: GridObject };

const DIRECTIONS: readonly string[] = ["up", "down", "left", "right"];

/** Everything wrong with a world. A run can start only from a world without problems. */
export function checkWorld(world: World): WorldProblem[] {
	const problems: WorldProblem[] = [];
	if (!inGrid(world.ant))
		problems.push({ code: "ant-outside-grid", ant: world.ant });
	if (!DIRECTIONS.includes(world.facing))
		problems.push({ code: "invalid-facing", facing: world.facing });
	const taken = new Set<number>();
	for (const object of world.objects) {
		if (!inGrid(object)) {
			problems.push({ code: "object-outside-grid", object });
			continue;
		}
		if (!isObjectChar(object.char))
			problems.push({ code: "invalid-object", object });
		if (object.x === world.ant.x && object.y === world.ant.y)
			problems.push({ code: "object-under-ant", object });
		const index = cellIndex(object);
		if (taken.has(index)) problems.push({ code: "duplicate-cell", object });
		taken.add(index);
	}
	return problems;
}

export function cellIndex(p: Point): number {
	return (p.y - 1) * GRID_SIZE + (p.x - 1);
}

export const STEP: Readonly<Record<Direction, Point>> = {
	up: { x: 0, y: -1 },
	down: { x: 0, y: 1 },
	left: { x: -1, y: 0 },
	right: { x: 1, y: 0 },
};

export function ahead(p: Point, direction: Direction): Point {
	const step = STEP[direction];
	return { x: p.x + step.x, y: p.y + step.y };
}

/** The `AT_EDGE` condition: the cell in front of the ant is outside the grid. */
export function atEdge(world: Pick<World, "ant" | "facing">): boolean {
	return !inGrid(ahead(world.ant, world.facing));
}
