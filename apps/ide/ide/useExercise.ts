import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TASKS } from "@repo/ant-tasks";
import { MESSAGES } from "@/i18n/messages";
import { readLanguage } from "@/lib/preferences";
import {
	newExercise,
	type Exercise,
	type ExerciseStore,
} from "@/storage/exercise";

export type Loaded =
	| { status: "loading" }
	| { status: "ready"; exercise: Exercise }
	| { status: "not-found" };

/** Resolves `/ide?task=N`, `/ide?id=…` or `/ide` to an exercise, creating it when needed. */
export function useExercise(
	store: ExerciseStore | undefined,
	query: { id: string | null; task: string | null },
): Loaded {
	const router = useRouter();
	const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });
	// React runs effects twice in development. Reusing the exercise created
	// for a query keeps that from saving two new exercises.
	const created = useRef(new Map<string, Exercise>());
	const once = (key: string, make: () => Exercise) => {
		let exercise = created.current.get(key);
		if (!exercise) {
			exercise = make();
			created.current.set(key, exercise);
		}
		return exercise;
	};

	useEffect(() => {
		if (!store) return;
		let alive = true;
		const done = (l: Loaded) => alive && setLoaded(l);
		// A new query starts a new load, so the previous result must not stay on screen.
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setLoaded({ status: "loading" });
		void (async () => {
			const language = readLanguage();
			const taskNumber = Number(query.task);
			if (query.task !== null) {
				if (!TASKS.some((t) => t.number === taskNumber))
					return done({ status: "not-found" });
				let exercise = await store.findByTask(taskNumber);
				if (!exercise) {
					exercise = once(`task-${taskNumber}`, () =>
						newExercise({ language, taskNumber }),
					);
					await store.save(exercise);
				}
				return done({ status: "ready", exercise });
			}
			if (query.id !== null) {
				const exercise = await store.load(query.id);
				return done(
					exercise
						? { status: "ready", exercise }
						: { status: "not-found" },
				);
			}
			const exercise = once("new", () =>
				newExercise({ language, title: MESSAGES[language].newProgram }),
			);
			await store.save(exercise);
			if (alive) router.replace(`/ide?id=${exercise.id}`);
		})();
		return () => {
			alive = false;
		};
	}, [store, query.id, query.task, router]);

	return loaded;
}
