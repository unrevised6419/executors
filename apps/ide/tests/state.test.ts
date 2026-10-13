import { describe, expect, test } from "vitest";
import { TASKS } from "@repo/ant-tasks";
import type { World } from "@repo/ant-runtime";
import { ideReducer, initialState, type IdeState } from "@/ide/state";
import { toolbarState } from "@/ide/toolbar-state";
import { newExercise } from "@/storage/exercise";

const free = initialState(newExercise({ language: "ro" }), 10);
const moved: World = { ...free.world, ant: { x: 4, y: 4 } };
const report = (status: "running" | "finished", world = moved) => ({
	type: "step" as const,
	world,
	steps: 3,
	current: undefined,
	status,
	error: undefined,
});

const run = (state: IdeState) =>
	ideReducer(state, { type: "start-run", paused: false });

describe("ideReducer", () => {
	test("a run shows each step and ends in done", () => {
		let s = run(free);
		expect(s.mode).toBe("running");
		s = ideReducer(s, report("running"));
		expect(s).toMatchObject({
			mode: "running",
			world: moved,
			run: { steps: 3 },
		});
		s = ideReducer(s, report("finished"));
		expect(s.mode).toBe("done");
		expect(s.exercise.start).toEqual(free.exercise.start);
	});

	test("ignores step reports after stop or reset", () => {
		const stopped = ideReducer(run(free), { type: "stop" });
		expect(stopped.mode).toBe("done");
		expect(ideReducer(stopped, report("running"))).toBe(stopped);
		const reset = ideReducer(run(free), { type: "reset" });
		expect(reset).toMatchObject({
			mode: "setup",
			world: free.exercise.start,
		});
		expect(ideReducer(reset, report("running"))).toBe(reset);
	});

	test("ignores edits while running", () => {
		const s = run(free);
		expect(ideReducer(s, { type: "edit-source", source: "x" })).toBe(s);
		expect(ideReducer(s, { type: "set-start", world: moved })).toBe(s);
	});

	test("editing after a run returns to setup from the start world", () => {
		const done = ideReducer(ideReducer(run(free), report("running")), {
			type: "stop",
		});
		const s = ideReducer(done, { type: "edit-source", source: "INCEPUT" });
		expect(s).toMatchObject({
			mode: "setup",
			world: free.exercise.start,
			run: undefined,
		});
		expect(s.exercise.source).toBe("INCEPUT");
	});

	test("set-start changes the start and the grid", () => {
		const s = ideReducer(free, { type: "set-start", world: moved });
		expect(s.exercise.start).toEqual(moved);
		expect(s.world).toEqual(moved);
	});

	test("checks the goal at the end of a task run and remembers a solve", () => {
		const task = initialState(
			newExercise({ language: "ro", taskNumber: 1 }),
			10,
		);
		const goal: World = {
			ant: { x: 5, y: 5 },
			facing: "down",
			objects: TASKS[0]!.goal,
		};
		const failed = ideReducer(run(task), report("finished"));
		expect(failed.goalCheck?.solved).toBe(false);
		const solved = ideReducer(run(task), report("finished", goal));
		expect(solved.goalCheck?.solved).toBe(true);
		expect(solved.exercise.solved).toBe(true);
		const later = ideReducer(run(solved), report("finished"));
		expect(later.exercise.solved).toBe(true);
	});

	test("pause and resume switch the mode", () => {
		const paused = ideReducer(run(free), { type: "pause" });
		expect(paused.mode).toBe("paused");
		expect(ideReducer(paused, { type: "resume" }).mode).toBe("running");
	});

	test("speed is clamped to 0..20", () => {
		expect(ideReducer(free, { type: "set-speed", speed: 25 }).speed).toBe(
			20,
		);
		expect(ideReducer(free, { type: "set-speed", speed: -1 }).speed).toBe(
			0,
		);
	});
});

test("toolbarState", () => {
	expect(toolbarState("setup")).toEqual({
		file: true,
		check: true,
		run: true,
		step: true,
		stop: false,
		reset: false,
	});
	expect(toolbarState("running")).toEqual({
		file: false,
		check: false,
		run: false,
		step: false,
		stop: true,
		reset: true,
	});
	expect(toolbarState("paused")).toEqual({
		file: false,
		check: false,
		run: true,
		step: true,
		stop: true,
		reset: true,
	});
	expect(toolbarState("done")).toEqual({
		file: true,
		check: true,
		run: true,
		step: true,
		stop: false,
		reset: true,
	});
});
