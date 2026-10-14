"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

// Monaco and the IDE need the browser, so they are never rendered on the server.
const IdeRoute = dynamic(
	() => import("@/ide/IdeRoute").then((m) => m.IdeRoute),
	{
		ssr: false,
	},
);

export function IdeLoader() {
	const params = useSearchParams();
	return <IdeRoute id={params.get("id")} task={params.get("task")} />;
}
