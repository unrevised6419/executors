import type { Mode } from "./mode";

/** Which toolbar actions are enabled. `file` covers New, Open, Save and the language. */
export interface ToolbarState {
	readonly file: boolean;
	readonly check: boolean;
	readonly run: boolean;
	readonly step: boolean;
	readonly stop: boolean;
	readonly reset: boolean;
}

export function toolbarState(mode: Mode): ToolbarState {
	const editing = mode === "setup" || mode === "done";
	return {
		file: editing,
		check: editing,
		run: mode !== "running",
		step: mode !== "running",
		stop: mode === "running" || mode === "paused",
		reset: mode !== "setup",
	};
}
