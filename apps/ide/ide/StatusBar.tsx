import { diagnosticMessage, runtimeErrorMessage } from "@/i18n/errors";
import type { Messages } from "@/i18n/messages";
import type { IdeState } from "./state";

export function StatusBar({ t, state }: { t: Messages; state: IdeState }) {
	const { diagnostics, run, mode, exercise } = state;
	const first = diagnostics[0];
	return (
		<footer className="flex flex-wrap gap-x-4 gap-y-1 border-t px-3 py-1 text-xs text-muted-foreground">
			<span data-testid="mode">{t.modes[mode]}</span>
			{run && <span>{t.steps(run.steps)}</span>}
			{first ? (
				<span className="text-destructive">
					{t.syntaxErrors(diagnostics.length)} —{" "}
					{first.range.start.line}:{" "}
					{diagnosticMessage(first, exercise.language)}
				</span>
			) : null}
			{run?.error && (
				<span className="text-destructive">
					{runtimeErrorMessage(run.error, exercise.language)}
				</span>
			)}
		</footer>
	);
}
