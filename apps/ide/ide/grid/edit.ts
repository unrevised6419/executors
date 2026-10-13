import {
	isObjectChar,
	sortObjects,
	type Point,
	type World,
} from "@repo/ant-runtime";

/** `*` marks the ant in .ant files, so it cannot be an object (ant-spec §7). */
export function isCellChar(char: string): boolean {
	return char !== "*" && isObjectChar(char);
}

const same = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

/** Puts `char` in an empty cell. Refused cells and characters leave the world as is. */
export function placeObject(world: World, at: Point, char: string): World {
	if (!isCellChar(char) || same(world.ant, at)) return world;
	if (world.objects.some((o) => same(o, at))) return world;
	return {
		...world,
		objects: sortObjects([...world.objects, { ...at, char }]),
	};
}

export function clearCell(world: World, at: Point): World {
	const objects = world.objects.filter((o) => !same(o, at));
	return objects.length === world.objects.length
		? world
		: { ...world, objects };
}

const NEXT_FACING = {
	right: "up",
	up: "left",
	left: "down",
	down: "right",
} as const satisfies Record<World["facing"], World["facing"]>;

/** The original's "Rotire" button: counter-clockwise (ant-spec §10). */
export function rotate(world: World): World {
	return { ...world, facing: NEXT_FACING[world.facing] };
}
