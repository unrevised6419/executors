import type { Diagnostic, Language, Range } from "@repo/ant-grammar";
import type { RunStatus, RuntimeError, World } from "@repo/ant-runtime";
import {
	checkGoal,
	START,
	TASKS,
	type GoalCheck,
	type Task,
} from "@repo/ant-tasks";
import type { Exercise } from "@/storage/exercise";
import type { Mode } from "./mode";

export interface RunView {
	readonly steps: number;
	/** The source of the step just run. */
	readonly current: Range | undefined;
	readonly status: RunStatus;
	readonly error: RuntimeError | undefined;
}

export interface IdeState {
	readonly exercise: Exercise;
	/** What the grid shows: the start in setup, the run's world otherwise. */
	readonly world: World;
	readonly mode: Mode;
	readonly run: RunView | undefined;
	readonly diagnostics: readonly Diagnostic[];
	readonly goalCheck: GoalCheck | undefined;
	/** Slider position, 0..20. */
	readonly speed: number;
	/** Bumped when the source is replaced from outside the editor (file open). */
	readonly sourceRevision: number;
}

export type StepReport = { readonly world: World } & RunView;

export type IdeAction =
	| { type: "edit-source"; source: string }
	| { type: "set-start"; world: World }
	| {
			type: "replace-content";
			source: string;
			start?: World;
			/** Names a free program; a task keeps the name of its task. */
			title?: string;
	  }
	| { type: "set-language"; language: Language }
	| { type: "set-diagnostics"; diagnostics: readonly Diagnostic[] }
	| { type: "start-run"; paused: boolean }
	| ({ type: "step" } & StepReport)
	| { type: "pause" }
	| { type: "resume" }
	| { type: "stop" }
	| { type: "reset" }
	| { type: "set-speed"; speed: number };

export function initialState(exercise: Exercise, speed: number): IdeState {
	return {
		exercise,
		world: exercise.start,
		mode: "setup",
		run: undefined,
		diagnostics: [],
		goalCheck: undefined,
		speed,
		sourceRevision: 0,
	};
}

export function taskOf(exercise: Exercise): Task | undefined {
	return exercise.taskNumber === undefined
		? undefined
		: TASKS[exercise.taskNumber - 1];
}

function sameWorld(a: World, b: World): boolean {
	return (
		a.ant.x === b.ant.x &&
		a.ant.y === b.ant.y &&
		a.facing === b.facing &&
		a.objects.length === b.objects.length &&
		a.objects.every((o, i) => {
			const other = b.objects[i]!;
			return o.x === other.x && o.y === other.y && o.char === other.char;
		})
	);
}

const running = (mode: Mode) => mode === "running" || mode === "paused";

/** Back to setup: the grid shows the (new) start world and the last run is dropped. */
function toSetup(state: IdeState, exercise: Exercise): IdeState {
	return {
		...state,
		exercise,
		world: exercise.start,
		mode: "setup",
		run: undefined,
		goalCheck: undefined,
	};
}

export function ideReducer(state: IdeState, action: IdeAction): IdeState {
	const { exercise } = state;
	switch (action.type) {
		case "edit-source":
			if (running(state.mode) || action.source === exercise.source)
				return state;
			return toSetup(state, { ...exercise, source: action.source });
		case "set-start":
			if (running(state.mode)) return state;
			return toSetup(state, { ...exercise, start: action.world });
		case "replace-content":
			if (running(state.mode)) return state;
			return toSetup(
				{ ...state, sourceRevision: state.sourceRevision + 1 },
				{
					...exercise,
					source: action.source,
					start: action.start ?? exercise.start,
					title:
						exercise.taskNumber === undefined
							? (action.title ?? exercise.title)
							: exercise.title,
				},
			);
		case "set-language":
			if (running(state.mode)) return state;
			return toSetup(state, { ...exercise, language: action.language });
		case "set-diagnostics":
			return { ...state, diagnostics: action.diagnostics };
		case "start-run":
			return {
				...state,
				world: exercise.start,
				mode: action.paused ? "paused" : "running",
				run: {
					steps: 0,
					current: undefined,
					status: "running",
					error: undefined,
				},
				goalCheck: undefined,
				diagnostics: [],
			};
		case "step": {
			// A timer can fire after Stop or Reset; its report is stale.
			if (!running(state.mode)) return state;
			const { world } = action;
			const run: RunView = {
				steps: action.steps,
				current: action.current,
				status: action.status,
				error: action.error,
			};
			if (run.status === "running") return { ...state, world, run };
			const task = taskOf(exercise);
			const goalCheck = task && checkGoal(world, task.goal);
			return {
				...state,
				world,
				run,
				mode: "done",
				goalCheck,
				// A task counts as solved only from the worksheet's start.
				exercise:
					goalCheck?.solved && sameWorld(exercise.start, START)
						? { ...exercise, solved: true }
						: exercise,
			};
		}
		case "pause":
			return state.mode === "running"
				? { ...state, mode: "paused" }
				: state;
		case "resume":
			return state.mode === "paused"
				? { ...state, mode: "running" }
				: state;
		case "stop":
			return running(state.mode) ? { ...state, mode: "done" } : state;
		case "reset":
			return toSetup(state, exercise);
		case "set-speed":
			return { ...state, speed: Math.min(20, Math.max(0, action.speed)) };
	}
}
