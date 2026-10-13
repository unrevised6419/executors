import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

// Playwright loads this file as CommonJS here, so `import.meta` is unavailable.
const repo = resolve(__dirname, "../../..");
const read = (path: string) => readFileSync(resolve(repo, path));

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => localStorage.setItem("furnica.speed", "20"));
});

async function openFile(page: Page, name: string, buffer: Buffer) {
	await page
		.getByTestId("open-file")
		.setInputFiles({ name, mimeType: "text/plain", buffer });
}

test("solves task 1 with its worksheet solution", async ({ page }) => {
	await page.goto("/ide?task=1");
	await openFile(
		page,
		"sarcina-01.antp",
		read("packages/ant-tasks/solutions/sarcina-01.antp"),
	);
	await page.getByRole("button", { name: "Execută" }).click();
	await expect(page.getByText("Rezolvat!")).toBeVisible({ timeout: 20_000 });
	await expect(page.getByTestId("mode")).toHaveText("Terminat");
});

for (const [name, encoding] of [
	["spec-example.ant", "windows-1250"],
	["mamatata.ant", "windows-1250"],
	["romanian.ant", "windows-1250"],
	["russian.ant", "windows-1251"],
] as const) {
	test(`opens and saves ${name} byte for byte`, async ({ page }) => {
		await page.goto("/ide");
		await page.waitForURL(/\/ide\?id=/);
		await page.getByRole("button", { name: "Fișier" }).click();
		await page
			.getByRole("menuitemradio", { name: encoding, exact: true })
			.click();
		const bytes = read(`packages/ant-file/tests/fixtures/${name}`);
		await openFile(page, name, bytes);
		await page.getByRole("button", { name: "Fișier" }).click();
		const download = page.waitForEvent("download");
		await page.getByRole("menuitem", { name: "Salvează" }).click();
		const saved = readFileSync(await (await download).path());
		expect(saved.equals(bytes)).toBe(true);
	});
}

test("a syntax error is marked and blocks the run", async ({ page }) => {
	await page.goto("/ide");
	await page.waitForURL(/\/ide\?id=/);
	await openFile(
		page,
		"broken.antp",
		Buffer.from("INCEPUT\nREPETA 2 ORI\nSUS\n"),
	);
	await expect(page.locator(".squiggly-error")).toBeVisible();
	await page.getByRole("button", { name: "Execută" }).click();
	await expect(page.getByText("Erori de sintaxă: 1").first()).toBeVisible();
	await expect(page.getByTestId("mode")).toHaveText("Pregătire");
});
