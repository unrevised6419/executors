import { useEffect, useRef } from "react";
import type { Exercise, ExerciseStore } from "./exercise";

/** Saves a change without waiting for the caller to handle the result. */
function persist(
	store: ExerciseStore,
	exercise: Exercise,
	onError: (error: unknown) => void,
): void {
	store.save({ ...exercise, updatedAt: Date.now() }).catch(onError);
}

/**
 * Saves `exercise` `delay` ms after its last change, at once when the page is
 * hidden, and at once on unmount if a change is still waiting. Failed saves go
 * to `onError`.
 */
export function useAutosave(
	store: ExerciseStore,
	exercise: Exercise,
	delay = 500,
	onError: (error: unknown) => void = console.error,
): void {
	const latest = useRef(exercise);
	const mounted = useRef(false);
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const pending = useRef<Exercise | undefined>(undefined);
	const report = useRef(onError);

	useEffect(() => {
		report.current = onError;
	});

	useEffect(() => {
		latest.current = exercise;
		if (!mounted.current) {
			mounted.current = true;
			return;
		}
		// A newer change replaces the waiting one, so the timer restarts.
		pending.current = exercise;
		clearTimeout(timer.current);
		timer.current = setTimeout(() => {
			pending.current = undefined;
			persist(store, exercise, report.current);
		}, delay);
	}, [store, exercise, delay]);

	useEffect(
		() => () => {
			clearTimeout(timer.current);
			if (pending.current) {
				persist(store, pending.current, report.current);
				pending.current = undefined;
			}
		},
		[store],
	);

	useEffect(() => {
		const flush = () => {
			if (document.visibilityState === "hidden")
				persist(store, latest.current, report.current);
		};
		document.addEventListener("visibilitychange", flush);
		return () => document.removeEventListener("visibilitychange", flush);
	}, [store]);
}
