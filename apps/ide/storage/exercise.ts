import type { Language } from "@repo/ant-grammar";
import { INITIAL_WORLD, type World } from "@repo/ant-runtime";
import { START } from "@repo/ant-tasks";

/** A student's saved work: a free program, or an attempt at one task. */
export interface Exercise {
	readonly id: string;
	/** Shown for free programs. Task exercises are named after their task. */
	readonly title: string;
	readonly language: Language;
	readonly source: string;
	readonly start: World;
	readonly taskNumber?: number;
	readonly solved: boolean;
	readonly updatedAt: number;
}

export type ExerciseSummary = Pick<
	Exercise,
	"id" | "title" | "taskNumber" | "solved" | "updatedAt"
>;

/** Where exercises live. Version 1 keeps them in the browser; a cloud store can replace it. */
export interface ExerciseStore {
	/** Newest first. */
	list(): Promise<ExerciseSummary[]>;
	load(id: string): Promise<Exercise | undefined>;
	findByTask(taskNumber: number): Promise<Exercise | undefined>;
	save(exercise: Exercise): Promise<void>;
	remove(id: string): Promise<void>;
}

export function newExercise(options: {
	language: Language;
	taskNumber?: number;
	title?: string;
}): Exercise {
	return {
		id: crypto.randomUUID(),
		title: options.title ?? "",
		language: options.language,
		source: "",
		start: options.taskNumber === undefined ? INITIAL_WORLD : START,
		...(options.taskNumber === undefined
			? {}
			: { taskNumber: options.taskNumber }),
		solved: false,
		updatedAt: Date.now(),
	};
}

export function summarize(e: Exercise): ExerciseSummary {
	return {
		id: e.id,
		title: e.title,
		...(e.taskNumber === undefined ? {} : { taskNumber: e.taskNumber }),
		solved: e.solved,
		updatedAt: e.updatedAt,
	};
}

export const newestFirst = (a: ExerciseSummary, b: ExerciseSummary) =>
	b.updatedAt - a.updatedAt;
