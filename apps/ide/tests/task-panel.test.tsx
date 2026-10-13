import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { TASKS } from "@repo/ant-tasks";
import { MESSAGES } from "@/i18n/messages";
import { TaskPanel } from "@/ide/tasks/TaskPanel";

const t = MESSAGES.en;
const task = TASKS[0]!;

test("shows the goal and no status before a run", () => {
	render(<TaskPanel t={t} task={task} check={undefined} />);
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
		/>,
	);
	expect(screen.queryByText("Solved!")).toBeNull();
	expect(screen.getByText("Missing: 1 · Misplaced: 1")).toBeDefined();
});
