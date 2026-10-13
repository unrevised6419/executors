import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { parse } from "@repo/ant-grammar";
import { MESSAGES } from "@/i18n/messages";
import { StatusBar } from "@/ide/StatusBar";
import { initialState, type IdeState } from "@/ide/state";
import { newExercise } from "@/storage/exercise";

const range = {
	start: { line: 2, column: 1, offset: 8 },
	end: { line: 2, column: 4, offset: 11 },
};

test("shows the mode and nothing else in setup", () => {
	const state = initialState(newExercise({ language: "en" }), 10);
	render(<StatusBar t={MESSAGES.en} state={state} />);
	expect(screen.getByTestId("mode").textContent).toBe(
		MESSAGES.en.modes.setup,
	);
	expect(screen.queryByText(/Steps:/)).toBeNull();
	expect(screen.queryByText(/Syntax errors/)).toBeNull();
	expect(screen.queryByText(/cannot leave the grid/)).toBeNull();
});

test("shows the syntax error count, its line and message", () => {
	const exercise = newExercise({ language: "en" });
	const { diagnostics } = parse("BEGIN\nUP\n", { language: "en" });
	const state: IdeState = {
		...initialState(exercise, 10),
		diagnostics,
	};
	render(<StatusBar t={MESSAGES.en} state={state} />);
	const line = diagnostics[0]!.range.start.line;
	expect(screen.getByText(/Syntax errors: 1/)).toBeDefined();
	expect(screen.getByText(new RegExp(`${line}:`))).toBeDefined();
	expect(screen.getByText(/Missing END\./)).toBeDefined();
});

test("shows steps, the done mode and a runtime error", () => {
	const exercise = newExercise({ language: "ro" });
	const state: IdeState = {
		...initialState(exercise, 10),
		mode: "done",
		run: {
			steps: 3,
			current: undefined,
			status: "failed",
			error: { code: "wall", range },
		},
	};
	render(<StatusBar t={MESSAGES.ro} state={state} />);
	expect(screen.getByText("Pași: 3")).toBeDefined();
	expect(screen.getByTestId("mode").textContent).toBe("Terminat");
	expect(screen.getByText("Furnica nu poate ieși din teren.")).toBeDefined();
});
