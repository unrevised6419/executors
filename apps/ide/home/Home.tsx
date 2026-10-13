"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import type { Language } from "@repo/ant-grammar";
import { TASKS } from "@repo/ant-tasks";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useDialogs } from "@/components/dialogs";
import { MESSAGES } from "@/i18n/messages";
import { readLanguage } from "@/lib/preferences";
import { newExercise, type ExerciseSummary } from "@/storage/exercise";
import { useStore } from "@/storage/StoreProvider";

export function Home() {
	const opened = useStore();
	const [language, setLanguage] = useState<Language>("ro");
	const [list, setList] = useState<ExerciseSummary[]>([]);
	const router = useRouter();
	const t = MESSAGES[language];
	const dialogs = useDialogs(t);

	// The saved language is only known in the browser, so it is read after hydration.
	// eslint-disable-next-line react-hooks/set-state-in-effect
	useEffect(() => setLanguage(readLanguage()), []);
	useEffect(() => {
		if (opened) void opened.store.list().then(setList);
	}, [opened]);

	const solved = new Set(
		list.filter((e) => e.solved).map((e) => e.taskNumber),
	);
	const free = list.filter((e) => e.taskNumber === undefined);

	async function create() {
		if (!opened) return;
		const fresh = newExercise({ language, title: t.newProgram });
		try {
			await opened.store.save(fresh);
		} catch {
			toast.error(t.notSaved);
			return;
		}
		router.push(`/ide?id=${fresh.id}`);
	}

	async function remove(id: string) {
		if (!opened || !(await dialogs.confirm(t.confirmRemove))) return;
		await opened.store.remove(id);
		setList(await opened.store.list());
	}

	return (
		<main className="mx-auto flex max-w-5xl flex-col gap-8 p-4 sm:p-8">
			<h1 className="text-3xl font-bold">{t.appName}</h1>
			<section className="flex flex-col gap-3">
				<h2 className="text-xl font-semibold">{t.tasks}</h2>
				<div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
					{TASKS.map((task) => (
						<Link
							key={task.number}
							href={`/ide?task=${task.number}`}
						>
							<Card className="hover:bg-accent">
								<CardHeader>
									<CardTitle className="flex items-center justify-between text-base">
										{t.task(task.number)}
										{solved.has(task.number) && (
											<CheckCircle2
												aria-label={t.solved}
												className="size-4 text-green-600"
											/>
										)}
									</CardTitle>
								</CardHeader>
							</Card>
						</Link>
					))}
				</div>
			</section>
			<section className="flex flex-col gap-3">
				<div className="flex items-center justify-between">
					<h2 className="text-xl font-semibold">{t.myPrograms}</h2>
					<Button disabled={!opened} onClick={() => void create()}>
						<Plus />
						{t.freeProgram}
					</Button>
				</div>
				{free.length === 0 ? (
					<p className="text-muted-foreground">{t.noPrograms}</p>
				) : (
					<ul className="divide-y rounded-md border">
						{free.map((e) => (
							<li
								key={e.id}
								className="flex items-center justify-between px-3 py-2"
							>
								<Link
									className="hover:underline"
									href={`/ide?id=${e.id}`}
								>
									{e.title || t.newProgram}
								</Link>
								<Button
									variant="ghost"
									size="icon"
									aria-label={t.remove}
									onClick={() => void remove(e.id)}
								>
									<Trash2 />
								</Button>
							</li>
						))}
					</ul>
				)}
			</section>
			{dialogs.element}
		</main>
	);
}
