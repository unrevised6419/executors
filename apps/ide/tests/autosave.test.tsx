import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { newExercise } from "@/storage/exercise";
import { MemoryExerciseStore } from "@/storage/memory-store";
import { useAutosave } from "@/storage/useAutosave";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
	vi.restoreAllMocks();
	vi.useRealTimers();
});

test("saves 500 ms after the last change, not on mount", () => {
	const store = new MemoryExerciseStore();
	const save = vi.spyOn(store, "save");
	const first = newExercise({ language: "ro" });
	const { rerender } = renderHook(({ e }) => useAutosave(store, e), {
		initialProps: { e: first },
	});
	vi.advanceTimersByTime(1000);
	expect(save).not.toHaveBeenCalled();

	rerender({ e: { ...first, source: "INCEPUT" } });
	vi.advanceTimersByTime(300);
	rerender({ e: { ...first, source: "INCEPUT\nSUS" } });
	vi.advanceTimersByTime(499);
	expect(save).not.toHaveBeenCalled();
	vi.advanceTimersByTime(1);
	expect(save).toHaveBeenCalledTimes(1);
	expect(save.mock.calls[0]![0].source).toBe("INCEPUT\nSUS");
});

test("saves at once when the page is hidden", () => {
	const store = new MemoryExerciseStore();
	const save = vi.spyOn(store, "save");
	const exercise = newExercise({ language: "ro" });
	renderHook(() => useAutosave(store, exercise));
	vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
	document.dispatchEvent(new Event("visibilitychange"));
	expect(save).toHaveBeenCalledTimes(1);
});

test("a change followed by unmount before 500 ms is saved once", () => {
	const store = new MemoryExerciseStore();
	const save = vi.spyOn(store, "save");
	const first = newExercise({ language: "ro" });
	const { rerender, unmount } = renderHook(({ e }) => useAutosave(store, e), {
		initialProps: { e: first },
	});
	rerender({ e: { ...first, source: "INCEPUT" } });
	vi.advanceTimersByTime(100);
	unmount();
	expect(save).toHaveBeenCalledTimes(1);
	expect(save.mock.calls[0]![0].source).toBe("INCEPUT");
	vi.advanceTimersByTime(1000);
	expect(save).toHaveBeenCalledTimes(1);
});

test("a rejected save is passed to onError", async () => {
	const store = new MemoryExerciseStore();
	const failure = new Error("quota");
	vi.spyOn(store, "save").mockRejectedValue(failure);
	const onError = vi.fn();
	const first = newExercise({ language: "ro" });
	const { rerender } = renderHook(
		({ e }) => useAutosave(store, e, 500, onError),
		{ initialProps: { e: first } },
	);
	rerender({ e: { ...first, source: "INCEPUT" } });
	await vi.advanceTimersByTimeAsync(500);
	expect(onError).toHaveBeenCalledTimes(1);
	expect(onError).toHaveBeenCalledWith(failure);
});
