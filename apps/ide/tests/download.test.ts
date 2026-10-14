import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { downloadBytes } from "@/ide/files/files";

const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
	vi.useRealTimers();
	URL.createObjectURL = original.create;
	URL.revokeObjectURL = original.revoke;
	vi.restoreAllMocks();
});

test("downloadBytes clicks a temporary link and revokes the URL late", () => {
	const create = vi.fn(() => "blob:test");
	const revoke = vi.fn();
	URL.createObjectURL = create;
	URL.revokeObjectURL = revoke;
	const click = vi
		.spyOn(HTMLAnchorElement.prototype, "click")
		.mockImplementation(function (this: HTMLAnchorElement) {
			expect(this.isConnected).toBe(true);
			expect(this.download).toBe("x.ant");
			expect(this.href).toBe("blob:test");
		});

	downloadBytes(new Uint8Array([1, 2]), "x.ant");

	expect(click).toHaveBeenCalledOnce();
	expect(document.querySelector("a[download]")).toBeNull();
	vi.advanceTimersByTime(29_999);
	expect(revoke).not.toHaveBeenCalled();
	vi.advanceTimersByTime(1);
	expect(revoke).toHaveBeenCalledWith("blob:test");
});
