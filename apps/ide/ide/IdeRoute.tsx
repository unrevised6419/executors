"use client";

import Link from "next/link";
import { MESSAGES } from "@/i18n/messages";
import { readLanguage } from "@/lib/preferences";
import { useStore } from "@/storage/StoreProvider";
import { IdeWorkspace } from "./IdeWorkspace";
import { useExercise } from "./useExercise";

export function IdeRoute({
	id,
	task,
}: {
	id: string | null;
	task: string | null;
}) {
	const opened = useStore();
	const loaded = useExercise(opened?.store, { id, task });
	const t = MESSAGES[readLanguage()];
	if (loaded.status === "not-found")
		return (
			<p className="p-6">
				{t.notFound}{" "}
				<Link className="underline" href="/">
					{t.home}
				</Link>
			</p>
		);
	if (loaded.status === "loading" || !opened)
		return <p className="p-6">{t.loading}</p>;
	return (
		<IdeWorkspace
			key={loaded.exercise.id}
			initial={loaded.exercise}
			store={opened.store}
		/>
	);
}
