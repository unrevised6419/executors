import {
	newestFirst,
	summarize,
	type Exercise,
	type ExerciseStore,
	type ExerciseSummary,
} from "./exercise";

/** Used when IndexedDB is unavailable. Everything is lost on reload. */
export class MemoryExerciseStore implements ExerciseStore {
	readonly #exercises = new Map<string, Exercise>();

	async list(): Promise<ExerciseSummary[]> {
		return [...this.#exercises.values()].map(summarize).sort(newestFirst);
	}

	async load(id: string): Promise<Exercise | undefined> {
		return this.#exercises.get(id);
	}

	async findByTask(taskNumber: number): Promise<Exercise | undefined> {
		return [...this.#exercises.values()].find(
			(e) => e.taskNumber === taskNumber,
		);
	}

	async save(exercise: Exercise): Promise<void> {
		this.#exercises.set(exercise.id, exercise);
	}

	async remove(id: string): Promise<void> {
		this.#exercises.delete(id);
	}
}
