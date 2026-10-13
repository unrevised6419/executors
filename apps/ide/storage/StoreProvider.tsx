"use client";

import { createContext, use, useEffect, useState, type ReactNode } from "react";
import { MESSAGES } from "@/i18n/messages";
import { readLanguage } from "@/lib/preferences";
import type { ExerciseStore } from "./exercise";
import { openExerciseStore } from "./indexeddb-store";

type Opened = { store: ExerciseStore; persistent: boolean };

const StoreContext = createContext<Opened | undefined>(undefined);

/** Opens the store once for the whole app. `useStore` is undefined until then. */
export function StoreProvider({ children }: { children: ReactNode }) {
	const [opened, setOpened] = useState<Opened>();
	useEffect(() => {
		let alive = true;
		void openExerciseStore().then((o) => alive && setOpened(o));
		return () => {
			alive = false;
		};
	}, []);
	return (
		<StoreContext value={opened}>
			{opened && !opened.persistent && (
				<p
					role="alert"
					className="bg-destructive px-4 py-2 text-sm text-white"
				>
					{MESSAGES[readLanguage()].notSaved}
				</p>
			)}
			{children}
		</StoreContext>
	);
}

export function useStore(): Opened | undefined {
	return use(StoreContext);
}
