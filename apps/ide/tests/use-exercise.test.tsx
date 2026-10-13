import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { useExercise } from "@/ide/useExercise";
import { MemoryExerciseStore } from "@/storage/memory-store";

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

beforeEach(() => {
	router.replace.mockClear();
	router.push.mockClear();
});

type Query = { id: string | null; task: string | null };
const bare: Query = { id: null, task: null };

function setup(store = new MemoryExerciseStore(), query: Query = bare) {
	const hook = renderHook(({ q }) => useExercise(store, q), {
		initialProps: { q: query },
	});
	return { store, ...hook };
}

test("a task is created once and found again", async () => {
	const { store, result, rerender } = setup(undefined, {
		id: null,
		task: "3",
	});
	await waitFor(() => expect(result.current.status).toBe("ready"));
	const first =
		result.current.status === "ready" ? result.current.exercise : undefined;
	expect(first?.taskNumber).toBe(3);
	expect(await store.list()).toHaveLength(1);

	rerender({ q: bare });
	rerender({ q: { id: null, task: "3" } });
	await waitFor(() => expect(result.current.status).toBe("ready"));
	const again =
		result.current.status === "ready" ? result.current.exercise : undefined;
	expect(again?.id).toBe(first?.id);
	expect(await store.list()).toHaveLength(2);
	expect((await store.list()).filter((e) => e.taskNumber === 3)).toHaveLength(
		1,
	);
});

test("unknown task and unknown id are not found", async () => {
	const task = setup(undefined, { id: null, task: "99" });
	await waitFor(() => expect(task.result.current.status).toBe("not-found"));
	const id = setup(undefined, { id: "missing", task: null });
	await waitFor(() => expect(id.result.current.status).toBe("not-found"));
});

test("a bare /ide creates a different exercise on every navigation", async () => {
	const { store, result, rerender } = setup();
	await waitFor(() => expect(router.replace).toHaveBeenCalledTimes(1));
	const firstUrl = router.replace.mock.calls[0]![0] as string;
	const firstId = firstUrl.replace("/ide?id=", "");
	expect(await store.load(firstId)).toBeDefined();

	rerender({ q: { id: firstId, task: null } });
	await waitFor(() => expect(result.current.status).toBe("ready"));
	rerender({ q: bare });
	await waitFor(() => expect(router.replace).toHaveBeenCalledTimes(2));
	const secondId = (router.replace.mock.calls[1]![0] as string).replace(
		"/ide?id=",
		"",
	);
	expect(secondId).not.toBe(firstId);
	expect(await store.list()).toHaveLength(2);
});

test("a failing store gives the error status", async () => {
	const store = new MemoryExerciseStore();
	vi.spyOn(store, "load").mockRejectedValue(new Error("boom"));
	const { result } = setup(store, { id: "x", task: null });
	await waitFor(() => expect(result.current.status).toBe("error"));
});
