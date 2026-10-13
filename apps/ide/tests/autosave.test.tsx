import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { newExercise } from "@/storage/exercise";
import { MemoryExerciseStore } from "@/storage/memory-store";
import { useAutosave } from "@/storage/useAutosave";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

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
