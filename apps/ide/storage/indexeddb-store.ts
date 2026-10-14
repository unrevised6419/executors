import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import {
	newestFirst,
	summarize,
	type Exercise,
	type ExerciseStore,
	type ExerciseSummary,
} from "./exercise";
import { MemoryExerciseStore } from "./memory-store";

interface FurnicaDB extends DBSchema {
	exercises: {
		key: string;
		value: Exercise;
		// Exercises without a task number are left out of this index.
		indexes: { taskNumber: number };
	};
}

export class IndexedDbExerciseStore implements ExerciseStore {
	static async open(name = "furnica"): Promise<IndexedDbExerciseStore> {
		const db = await openDB<FurnicaDB>(name, 1, {
			upgrade(db) {
				db.createObjectStore("exercises", {
					keyPath: "id",
				}).createIndex("taskNumber", "taskNumber");
			},
		});
		return new IndexedDbExerciseStore(db);
	}

	readonly #db: IDBPDatabase<FurnicaDB>;

	private constructor(db: IDBPDatabase<FurnicaDB>) {
		this.#db = db;
	}

	async list(): Promise<ExerciseSummary[]> {
		return (await this.#db.getAll("exercises"))
			.map(summarize)
			.sort(newestFirst);
	}

	load(id: string): Promise<Exercise | undefined> {
		return this.#db.get("exercises", id);
	}

	findByTask(taskNumber: number): Promise<Exercise | undefined> {
		return this.#db.getFromIndex("exercises", "taskNumber", taskNumber);
	}

	async save(exercise: Exercise): Promise<void> {
		await this.#db.put("exercises", exercise);
	}

	async remove(id: string): Promise<void> {
		await this.#db.delete("exercises", id);
	}
}

/** IndexedDB when the browser allows it, otherwise memory. */
export async function openExerciseStore(): Promise<{
	store: ExerciseStore;
	persistent: boolean;
}> {
	try {
		return { store: await IndexedDbExerciseStore.open(), persistent: true };
	} catch {
		return { store: new MemoryExerciseStore(), persistent: false };
	}
}
