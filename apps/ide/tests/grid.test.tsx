import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { Grid } from "@/ide/grid/Grid";

const objects = [{ x: 3, y: 2, char: "m" }];

test("draws objects and the ant, and reports clicks on other cells", () => {
	const onCellClick = vi.fn();
	render(
		<Grid
			label="grid"
			objects={objects}
			ant={{ point: { x: 1, y: 1 }, facing: "left" }}
			onCellClick={onCellClick}
		/>,
	);
	expect(screen.getByLabelText("3,2").textContent).toBe("m");
	expect(screen.getByRole("img", { name: "left" })).toBeDefined();
	fireEvent.click(screen.getByLabelText("3,2"));
	expect(onCellClick).toHaveBeenCalledWith({ x: 3, y: 2 });
	fireEvent.click(screen.getByLabelText("1,1"));
	expect(onCellClick).toHaveBeenCalledTimes(1);
});

test("marks missing and misplaced cells", () => {
	render(
		<Grid
			label="grid"
			objects={[{ x: 1, y: 1, char: "a" }]}
			missing={[{ x: 2, y: 2, char: "t" }]}
			misplaced={[{ x: 1, y: 1, char: "a" }]}
		/>,
	);
	expect(screen.getByLabelText("2,2").dataset.state).toBe("missing");
	expect(screen.getByLabelText("2,2").textContent).toBe("t");
	expect(screen.getByLabelText("1,1").dataset.state).toBe("misplaced");
});

test("cells are not buttons without a click handler", () => {
	render(<Grid label="goal" objects={objects} size="sm" />);
	expect(screen.queryAllByRole("button")).toHaveLength(0);
});
