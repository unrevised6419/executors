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
	| { status: "not-found" }
	| { status: "error" };

/**
 * Resolves `/ide?task=N`, `/ide?id=…` or a bare `/ide` to an exercise, creating
 * it when needed. The route instance can be reused across navigations, so
 * nothing created for one navigation may be handed to a later one.
 */
export function useExercise(
	store: ExerciseStore | undefined,
	query: { id: string | null; task: string | null },
): Loaded {
	const router = useRouter();
	const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });
	// React runs effects twice in development. Both runs share the resolution
	// that is already in flight, so a new exercise is created and saved once.
	// An entry lives only until its resolution settles.
	const inflight = useRef(new Map<string, Promise<Exercise>>());
	const shared = (key: string, resolve: () => Promise<Exercise>) => {
		let promise = inflight.current.get(key);
		if (!promise) {
			promise = resolve().finally(() => inflight.current.delete(key));
			inflight.current.set(key, promise);
		}
		return promise;
	};

	useEffect(() => {
		if (!store) return;
		let alive = true;
		const done = (l: Loaded) => alive && setLoaded(l);
		// A new query starts a new load, so the previous result must not stay on screen.
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setLoaded({ status: "loading" });
		void (async () => {
			try {
				const language = readLanguage();
				const taskNumber = Number(query.task);
				if (query.task !== null) {
					if (!TASKS.some((t) => t.number === taskNumber))
						return done({ status: "not-found" });
					const exercise = await shared(
						`task-${taskNumber}`,
						async () => {
							const found = await store.findByTask(taskNumber);
							if (found) return found;
							const created = newExercise({
								language,
								taskNumber,
							});
							await store.save(created);
							return created;
						},
					);
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
				const exercise = await shared("new", async () => {
					const created = newExercise({
						language,
						title: MESSAGES[language].newProgram,
					});
					await store.save(created);
					return created;
				});
				if (alive) router.replace(`/ide?id=${exercise.id}`);
			} catch {
				done({ status: "error" });
			}
		})();
		return () => {
			alive = false;
		};
	}, [store, query.id, query.task, router]);

	return loaded;
}
