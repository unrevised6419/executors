"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { LANGUAGES, type Language } from "@repo/ant-grammar";
import {
	CheckCheck,
	FilePlus,
	Home,
	Moon,
	Play,
	RotateCcw,
	Square,
	StepForward,
	Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type { Messages } from "@/i18n/messages";
import type { ToolbarState } from "./toolbar-state";

const LANGUAGE_NAMES: Record<Language, string> = {
	ro: "Română",
	en: "English",
	ru: "Русский",
};

export interface ToolbarActions {
	onNew: () => void;
	onCheck: () => void;
	onRun: () => void;
	onStep: () => void;
	onStop: () => void;
	onReset: () => void;
	onSpeed: (speed: number) => void;
	onLanguage: (language: Language) => void;
}

export function Toolbar({
	t,
	enabled,
	speed,
	language,
	fileMenu,
	actions,
}: {
	t: Messages;
	enabled: ToolbarState;
	speed: number;
	language: Language;
	fileMenu: ReactNode;
	actions: ToolbarActions;
}) {
	const { resolvedTheme, setTheme } = useTheme();
	const tool = (
		label: string,
		icon: ReactNode,
		on: () => void,
		enabledNow: boolean,
	) => (
		<Button
			variant="ghost"
			size="icon"
			aria-label={label}
			title={label}
			disabled={!enabledNow}
			onClick={on}
		>
			{icon}
		</Button>
	);
	return (
		<header className="flex flex-wrap items-center gap-1 border-b px-2 py-1">
			<Button
				variant="ghost"
				size="icon"
				asChild
				aria-label={t.home}
				title={t.home}
			>
				<Link href="/">
					<Home />
				</Link>
			</Button>
			{tool(t.newFile, <FilePlus />, actions.onNew, enabled.file)}
			{fileMenu}
			<span className="mx-1 h-6 w-px bg-border" />
			{tool(t.check, <CheckCheck />, actions.onCheck, enabled.check)}
			{tool(t.run, <Play />, actions.onRun, enabled.run)}
			{tool(t.step, <StepForward />, actions.onStep, enabled.step)}
			{tool(t.stop, <Square />, actions.onStop, enabled.stop)}
			{tool(t.reset, <RotateCcw />, actions.onReset, enabled.reset)}
			<span className="mx-1 h-6 w-px bg-border" />
			<label className="flex items-center gap-2 text-sm">
				{t.speed}
				<Slider
					className="w-28"
					min={0}
					max={20}
					step={1}
					value={[speed]}
					aria-label={t.speed}
					onValueChange={([v]) =>
						v !== undefined && actions.onSpeed(v)
					}
				/>
			</label>
			<div className="ml-auto flex items-center gap-1">
				<Select
					value={language}
					disabled={!enabled.file}
					onValueChange={(v) => actions.onLanguage(v as Language)}
				>
					<SelectTrigger size="sm" aria-label={t.language}>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{LANGUAGES.map((l) => (
							<SelectItem key={l} value={l}>
								{LANGUAGE_NAMES[l]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{tool(
					t.theme,
					resolvedTheme === "dark" ? <Sun /> : <Moon />,
					() => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
					true,
				)}
			</div>
		</header>
	);
}
