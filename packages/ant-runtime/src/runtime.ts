/**
 * Runs a parsed program one step at a time.
 *
 * Each step executes one statement: a move, a call, an IF test (whose branch
 * is the next step), a REPEAT head or a WHILE test. Control flow lives on an
 * explicit stack of frames, so deep recursion never grows the JavaScript
 * stack, and a run can be paused or abandoned between any two steps.
 */

import {
	sameWord,
	type Call,
	type Condition,
	type Direction,
	type Procedure,
	type Program,
	type Range,
	type Statement,
} from "@repo/ant-grammar";
import {
	atEdge,
	cellIndex,
	checkWorld,
	GRID_SIZE,
	INITIAL_WORLD,
	planMove,
	type GridObject,
	type MoveOutcome,
	type Point,
	type Push,
	type World,
} from "./world.ts";

export const DEFAULT_MAX_STEPS = 100_000;
export const DEFAULT_MAX_DEPTH = 1_000;

export interface RunOptions {
	/** The starting state. Defaults to `INITIAL_WORLD`. */
	readonly world?: World;
	/** Steps allowed before the run fails with `step-limit`. */
	readonly maxSteps?: number;
	/** Nested procedure calls allowed before the run fails with `depth-limit`. */
	readonly maxDepth?: number;
}

export type RuntimeError =
	/** The ant tried to walk off the grid. */
	| { readonly code: "wall"; readonly range: Range }
	/** The pushed object would leave the grid. */
	| {
			readonly code: "push-off-grid";
			readonly object: GridObject;
			readonly range: Range;
	  }
	/** Two objects in a row cannot be pushed. */
	| {
			readonly code: "push-blocked";
			readonly object: GridObject;
			readonly blocker: GridObject;
			readonly range: Range;
	  }
	| {
			readonly code: "step-limit";
			readonly limit: number;
			readonly range: Range;
	  }
	| {
			readonly code: "depth-limit";
			readonly limit: number;
			readonly range: Range;
	  }
	/** Only reachable with a program that `parse` did not accept. */
	| {
			readonly code: "undefined-procedure";
			readonly name: string;
			readonly range: Range;
	  };

export type RuntimeErrorCode = RuntimeError["code"];

/** What one step did. `range` is the source to highlight. */
export type Step =
	| {
			readonly kind: "move";
			readonly direction: Direction;
			readonly from: Point;
			readonly to: Point;
			readonly push: Push | undefined;
			readonly range: Range;
	  }
	| {
			readonly kind: "test";
			readonly condition: Condition;
			readonly result: boolean;
			readonly range: Range;
	  }
	| { readonly kind: "repeat"; readonly count: number; readonly range: Range }
	| {
			readonly kind: "call";
			readonly procedure: string;
			readonly range: Range;
	  }
	| { readonly kind: "error"; readonly error: RuntimeError };

export type RunStatus = "running" | "finished" | "failed";

interface Frame {
	readonly body: readonly Statement[];
	/** The next statement to run. */
	index: number;
	/** Passes still to run after the current one (REPEAT bodies). */
	remaining: number;
	/** Set on a procedure body: the call that entered it. */
	readonly call: Call | undefined;
}

export interface StackEntry {
	readonly procedure: string;
	readonly call: Range;
}

export class Run {
	readonly maxSteps: number;
	readonly maxDepth: number;
	#status: RunStatus = "running";
	#error: RuntimeError | undefined;
	#steps = 0;
	#depth = 0;
	readonly #frames: Frame[];
	readonly #procedures: readonly Procedure[];
	readonly #lookup = new Map<Call, Procedure | undefined>();
	readonly #cells: (string | undefined)[] = [];
	#ant: Point;
	#facing: Direction;

	constructor(program: Program, options: RunOptions = {}) {
		const world = options.world ?? INITIAL_WORLD;
		const problems = checkWorld(world);
		if (problems.length > 0)
			throw new RangeError(
				`Invalid world: ${problems.map((p) => p.code).join(", ")}`,
			);
		this.maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;
		this.maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;
		this.#procedures = program.procedures;
		this.#ant = world.ant;
		this.#facing = world.facing;
		for (const o of world.objects) this.#cells[cellIndex(o)] = o.char;
		this.#frames = [newFrame(program.body)];
		this.#settle();
	}

	get status(): RunStatus {
		return this.#status;
	}

	/** Set when `status` is `failed`. */
	get error(): RuntimeError | undefined {
		return this.#error;
	}

	/** Steps executed so far. */
	get steps(): number {
		return this.#steps;
	}

	/** A snapshot of the grid. */
	get world(): World {
		const objects: GridObject[] = [];
		for (let y = 1; y <= GRID_SIZE; y++)
			for (let x = 1; x <= GRID_SIZE; x++) {
				const char = this.#cells[cellIndex({ x, y })];
				if (char !== undefined) objects.push({ x, y, char });
			}
		return { ant: this.#ant, facing: this.#facing, objects };
	}

	/** The source the next step will run, while the run is still going. */
	get next(): Range | undefined {
		if (this.#status !== "running") return undefined;
		const statement = this.#peek();
		return statement && headRange(statement);
	}

	/** The procedures being run, outermost first. */
	get callStack(): readonly StackEntry[] {
		return this.#frames.flatMap((f) =>
			f.call ? [{ procedure: f.call.name.text, call: f.call.range }] : [],
		);
	}

	/** Run one step. Returns `undefined` once the run is over. */
	step(): Step | undefined {
		if (this.#status !== "running") return undefined;
		const frame = this.#frames.at(-1)!;
		const statement = frame.body[frame.index]!;
		if (this.#steps >= this.maxSteps)
			return this.#fail({
				code: "step-limit",
				limit: this.maxSteps,
				range: headRange(statement),
			});
		this.#steps++;
		const result = this.#execute(frame, statement);
		if (this.#status === "running") this.#settle();
		return result;
	}

	/** Run steps until the run is over. */
	finish(): this {
		while (this.step() !== undefined);
		return this;
	}

	#execute(frame: Frame, statement: Statement): Step {
		switch (statement.kind) {
			case "move":
				frame.index++;
				return this.#move(statement.direction, statement.range);
			case "call": {
				const procedure = this.#procedure(statement);
				if (procedure === undefined)
					return this.#fail({
						code: "undefined-procedure",
						name: statement.name.text,
						range: statement.range,
					});
				if (this.#depth >= this.maxDepth)
					return this.#fail({
						code: "depth-limit",
						limit: this.maxDepth,
						range: statement.range,
					});
				frame.index++;
				if (procedure.body.length > 0) {
					this.#frames.push({
						...newFrame(procedure.body),
						call: statement,
					});
					this.#depth++;
				}
				return {
					kind: "call",
					procedure: procedure.name.text,
					range: statement.range,
				};
			}
			case "if": {
				frame.index++;
				const result = this.#test(statement.condition);
				const branch = result ? statement.then : statement.else;
				if (branch) this.#frames.push(newFrame([branch]));
				return {
					kind: "test",
					condition: statement.condition,
					result,
					range: statement.range,
				};
			}
			case "repeat":
				frame.index++;
				if (statement.count > 0 && statement.body.length > 0)
					this.#frames.push({
						...newFrame(statement.body),
						remaining: statement.count - 1,
					});
				return {
					kind: "repeat",
					count: statement.count,
					range: statement.header,
				};
			case "while": {
				// The frame stays on the WHILE, so the test runs again after each pass.
				const result = this.#test(statement.condition);
				if (!result) frame.index++;
				else if (statement.body.length > 0)
					this.#frames.push(newFrame(statement.body));
				return {
					kind: "test",
					condition: statement.condition,
					result,
					range: statement.header,
				};
			}
		}
	}

	#move(direction: Direction, range: Range): Step {
		// The ant turns even when the move then fails.
		this.#facing = direction;
		const from = this.#ant;
		const outcome = planMove(
			from,
			direction,
			(p) => this.#cells[cellIndex(p)],
		);
		if (!outcome.ok) return this.#fail(moveError(outcome, range));
		const { push } = outcome;
		if (push) {
			this.#cells[cellIndex(push.to)] = push.char;
			this.#cells[cellIndex(push.from)] = undefined;
		}
		this.#ant = outcome.to;
		return { kind: "move", direction, from, to: outcome.to, push, range };
	}

	#test(condition: Condition): boolean {
		const edge = atEdge({ ant: this.#ant, facing: this.#facing });
		return condition === "atEdge" ? edge : !edge;
	}

	#procedure(call: Call): Procedure | undefined {
		if (!this.#lookup.has(call))
			this.#lookup.set(
				call,
				this.#procedures.find((p) =>
					sameWord(p.name.text, call.name.text),
				),
			);
		return this.#lookup.get(call);
	}

	#fail(error: RuntimeError): Step {
		this.#status = "failed";
		this.#error = error;
		return { kind: "error", error };
	}

	#peek(): Statement | undefined {
		const frame = this.#frames.at(-1);
		return frame?.body[frame.index];
	}

	/** Leave finished frames, so the top frame points at the next statement. */
	#settle(): void {
		for (;;) {
			const frame = this.#frames.at(-1);
			if (frame === undefined) {
				this.#status = "finished";
				return;
			}
			if (frame.index < frame.body.length) return;
			if (frame.remaining > 0) {
				frame.remaining--;
				frame.index = 0;
				continue;
			}
			this.#frames.pop();
			if (frame.call) this.#depth--;
		}
	}
}

function newFrame(body: readonly Statement[]): Frame {
	return { body, index: 0, remaining: 0, call: undefined };
}

/** The part of a statement to highlight: the head line of a block. */
function headRange(statement: Statement): Range {
	return statement.kind === "repeat" || statement.kind === "while"
		? statement.header
		: statement.range;
}

export interface RunResult {
	readonly status: Exclude<RunStatus, "running">;
	readonly error: RuntimeError | undefined;
	readonly world: World;
	readonly steps: number;
}

/** Run a program to the end. */
export function runProgram(program: Program, options?: RunOptions): RunResult {
	const run = new Run(program, options).finish();
	return {
		status: run.status as RunResult["status"],
		error: run.error,
		world: run.world,
		steps: run.steps,
	};
}

function moveError(
	outcome: Extract<MoveOutcome, { ok: false }>,
	range: Range,
): RuntimeError {
	switch (outcome.code) {
		case "wall":
			return { code: "wall", range };
		case "push-off-grid":
			return { code: "push-off-grid", object: outcome.object, range };
		case "push-blocked":
			return {
				code: "push-blocked",
				object: outcome.object,
				blocker: outcome.blocker,
				range,
			};
	}
}
