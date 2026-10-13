import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { GridControls } from "@/ide/grid/GridControls";
import { MESSAGES } from "@/i18n/messages";

const t = MESSAGES.en;

function setup(props: { deleteMode?: boolean } = {}) {
	const handlers = {
		onCharChange: vi.fn(),
		onDeleteModeChange: vi.fn(),
		onMove: vi.fn(),
		onRotate: vi.fn(),
	};
	render(
		<GridControls
			t={t}
			disabled={false}
			char="a"
			deleteMode={props.deleteMode ?? false}
			{...handlers}
		/>,
	);
	return handlers;
}

test("keeps only the last character typed", () => {
	const { onCharChange } = setup();
	fireEvent.change(screen.getByRole("textbox"), { target: { value: "ab" } });
	expect(onCharChange).toHaveBeenCalledWith("b");
});

test("disables the character box in delete mode", () => {
	setup({ deleteMode: true });
	expect((screen.getByRole("textbox") as HTMLInputElement).disabled).toBe(
		true,
	);
});

test("arrows move and rotate rotates", () => {
	const { onMove, onRotate } = setup();
	fireEvent.click(screen.getByRole("button", { name: t.arrows.up }));
	expect(onMove).toHaveBeenCalledWith("up");
	fireEvent.click(screen.getByRole("button", { name: t.rotate }));
	expect(onRotate).toHaveBeenCalledTimes(1);
});
