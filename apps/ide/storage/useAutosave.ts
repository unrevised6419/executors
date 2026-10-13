import { useEffect, useRef } from "react";
import type { Exercise, ExerciseStore } from "./exercise";

/** Saves `exercise` `delay` ms after its last change, and at once when the page is hidden. */
export function useAutosave(
	store: ExerciseStore,
	exercise: Exercise,
	delay = 500,
): void {
	const latest = useRef(exercise);
	const mounted = useRef(false);

	useEffect(() => {
		latest.current = exercise;
		if (!mounted.current) {
			mounted.current = true;
			return;
		}
		const timer = setTimeout(
			() => void store.save({ ...exercise, updatedAt: Date.now() }),
			delay,
		);
		return () => clearTimeout(timer);
	}, [store, exercise, delay]);

	useEffect(() => {
		const flush = () => {
			if (document.visibilityState === "hidden")
				void store.save({ ...latest.current, updatedAt: Date.now() });
		};
		document.addEventListener("visibilitychange", flush);
		return () => document.removeEventListener("visibilitychange", flush);
	}, [store]);
}
