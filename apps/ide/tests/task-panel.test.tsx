import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { TASKS } from "@repo/ant-tasks";
import { MESSAGES } from "@/i18n/messages";
import { TaskPanel } from "@/ide/tasks/TaskPanel";

const t = MESSAGES.en;
const task = TASKS[0]!;

test("shows the goal and no status before a run", () => {
	render(
		<TaskPanel
			t={t}
			task={task}
			check={undefined}
			onRestoreStart={() => {}}
			disabled={false}
		/>,
	);
	expect(screen.getByText("Task 1")).toBeDefined();
	expect(screen.getByRole("group", { name: "Goal" })).toBeDefined();
	expect(screen.queryByText("Solved!")).toBeNull();
});

test("shows solved or what is left", () => {
	const { rerender } = render(
		<TaskPanel
			t={t}
			task={task}
			check={{ solved: true, missing: [], misplaced: [] }}
			onRestoreStart={() => {}}
			disabled={false}
		/>,
	);
	expect(screen.getByText("Solved!")).toBeDefined();
	rerender(
		<TaskPanel
			t={t}
			task={task}
			check={{
				solved: false,
				missing: [{ x: 1, y: 7, char: "m" }],
				misplaced: [{ x: 2, y: 2, char: "m" }],
			}}
			onRestoreStart={() => {}}
			disabled={false}
		/>,
	);
	expect(screen.queryByText("Solved!")).toBeNull();
	expect(screen.getByText("Missing: 1 · Misplaced: 1")).toBeDefined();
});

test("restores the task's start, unless a run is going", () => {
	const onRestoreStart = vi.fn();
	const { rerender } = render(
		<TaskPanel
			t={t}
			task={task}
			check={undefined}
			onRestoreStart={onRestoreStart}
			disabled={false}
		/>,
	);
	fireEvent.click(screen.getByRole("button", { name: t.restoreStart }));
	expect(onRestoreStart).toHaveBeenCalledTimes(1);
	rerender(
		<TaskPanel
			t={t}
			task={task}
			check={undefined}
			onRestoreStart={onRestoreStart}
			disabled
		/>,
	);
	expect(
		(
			screen.getByRole("button", {
				name: t.restoreStart,
			}) as HTMLButtonElement
		).disabled,
	).toBe(true);
});
