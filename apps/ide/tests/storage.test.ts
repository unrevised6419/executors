import "fake-indexeddb/auto";
import { describe, expect, test } from "vitest";
import { INITIAL_WORLD } from "@repo/ant-runtime";
import { START } from "@repo/ant-tasks";
import { newExercise, type ExerciseStore } from "@/storage/exercise";
import { IndexedDbExerciseStore } from "@/storage/indexeddb-store";
import { MemoryExerciseStore } from "@/storage/memory-store";

test("newExercise starts tasks from the worksheet and free programs empty", () => {
	expect(newExercise({ language: "ro", taskNumber: 3 })).toMatchObject({
		taskNumber: 3,
		start: START,
		source: "",
		solved: false,
	});
	expect(newExercise({ language: "en", title: "Mine" })).toMatchObject({
		title: "Mine",
		start: INITIAL_WORLD,
	});
});

let db = 0;
describe.each<[string, () => Promise<ExerciseStore>]>([
	["memory", async () => new MemoryExerciseStore()],
	["IndexedDB", () => IndexedDbExerciseStore.open(`test-${db++}`)],
])("%s store", (_, open) => {
	test("saves, loads, lists newest first and removes", async () => {
		const store = await open();
		const a = {
			...newExercise({ language: "ro", title: "a" }),
			updatedAt: 1,
		};
		const b = {
			...newExercise({ language: "ro", title: "b" }),
			updatedAt: 2,
		};
		await store.save(a);
		await store.save(b);
		expect(await store.load(a.id)).toEqual(a);
		expect((await store.list()).map((s) => s.title)).toEqual(["b", "a"]);
		await store.remove(a.id);
		expect(await store.load(a.id)).toBeUndefined();
	});

	test("finds the exercise of a task", async () => {
		const store = await open();
		const task = newExercise({ language: "ro", taskNumber: 7 });
		await store.save(newExercise({ language: "ro" }));
		await store.save(task);
		expect(await store.findByTask(7)).toEqual(task);
		expect(await store.findByTask(8)).toBeUndefined();
	});
});
