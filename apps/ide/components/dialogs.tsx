"use client";

import { useCallback, useState } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Messages } from "@/i18n/messages";

interface Pending {
	kind: "confirm" | "alert";
	title: string;
	body?: string;
	action?: string;
	resolve: (ok: boolean) => void;
}

/** Promise-based confirm and alert dialogs; render `element` once. */
export function useDialogs(t: Messages) {
	const [pending, setPending] = useState<Pending | null>(null);

	const confirm = useCallback(
		(title: string, body?: string, action?: string) =>
			new Promise<boolean>((resolve) =>
				setPending({ kind: "confirm", title, body, action, resolve }),
			),
		[],
	);
	const alert = useCallback(
		(title: string, body?: string) =>
			new Promise<void>((resolve) =>
				setPending({
					kind: "alert",
					title,
					body,
					resolve: () => resolve(),
				}),
			),
		[],
	);

	const close = (ok: boolean) => {
		pending?.resolve(ok);
		setPending(null);
	};

	const element = (
		<AlertDialog
			open={pending !== null}
			onOpenChange={(open) => !open && close(false)}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{pending?.title}</AlertDialogTitle>
					{pending?.body && (
						<AlertDialogDescription>
							{pending.body}
						</AlertDialogDescription>
					)}
				</AlertDialogHeader>
				<AlertDialogFooter>
					{pending?.kind === "confirm" && (
						<AlertDialogCancel onClick={() => close(false)}>
							{t.cancel}
						</AlertDialogCancel>
					)}
					<AlertDialogAction onClick={() => close(true)}>
						{pending?.action ?? t.ok}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);

	return { confirm, alert, element };
}
