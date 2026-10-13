import type { GridObject, World } from "@repo/ant-runtime";

export interface GoalCheck {
	readonly solved: boolean;
	/** Goal cells that do not hold their letter. */
	readonly missing: readonly GridObject[];
	/** Letters standing outside the goal, or on a goal cell meant for another letter. */
	readonly misplaced: readonly GridObject[];
}

/** Compares the letters of a world with a goal. The ant's position does not count. */
export function checkGoal(
	world: World,
	goal: readonly GridObject[],
): GoalCheck {
	const key = (o: GridObject) => `${o.x},${o.y},${o.char}`;
	const placed = new Set(world.objects.map(key));
	const wanted = new Set(goal.map(key));
	const missing = goal.filter((o) => !placed.has(key(o)));
	const misplaced = world.objects.filter((o) => !wanted.has(key(o)));
	return {
		solved: missing.length === 0 && misplaced.length === 0,
		missing,
		misplaced,
	};
}
