import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { useDialogs } from "@/components/dialogs";
import { MESSAGES } from "@/i18n/messages";

const t = MESSAGES.en;

function setup() {
	let dialogs!: ReturnType<typeof useDialogs>;
	function Harness() {
		dialogs = useDialogs(t);
		return dialogs.element;
	}
	render(<Harness />);
	return {
		confirm: (title: string, body?: string, action?: string) => {
			const result: { value?: boolean } = {};
			act(() => {
				void dialogs.confirm(title, body, action).then((v) => {
					result.value = v;
				});
			});
			return result;
		},
		alert: (title: string) => {
			const result = { done: false };
			act(() => {
				void dialogs.alert(title).then(() => {
					result.done = true;
				});
			});
			return result;
		},
	};
}

const flush = () => act(async () => {});

test("a second dialog resolves the first with false, then answers itself", async () => {
	const { confirm } = setup();
	const a = confirm("A");
	const b = confirm("B", undefined, "Do it");
	await flush();
	expect(a.value).toBe(false);
	expect(b.value).toBeUndefined();
	expect(screen.getByText("B")).toBeTruthy();
	fireEvent.click(screen.getByRole("button", { name: "Do it" }));
	await flush();
	expect(b.value).toBe(true);
	expect(screen.queryByText("B")).toBeNull();
});

test("cancel resolves false and an alert resolves on ok", async () => {
	const { confirm, alert } = setup();
	const c = confirm("Sure?");
	fireEvent.click(screen.getByRole("button", { name: t.cancel }));
	await flush();
	expect(c.value).toBe(false);

	const a = alert("Heads up");
	expect(screen.queryByRole("button", { name: t.cancel })).toBeNull();
	fireEvent.click(screen.getByRole("button", { name: t.ok }));
	await flush();
	expect(a.done).toBe(true);
});
