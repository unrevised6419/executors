import type * as Monaco from "monaco-editor";
import {
	createMonacoTokensProvider,
	LANGUAGES,
	type Language,
} from "@repo/ant-grammar";

export const languageId = (language: Language) => `furnica-${language}`;

let done = false;

/** Registers the three languages and two themes once, with Monaco bundled locally. */
export function setupMonaco(monaco: typeof Monaco): void {
	if (done) return;
	done = true;
	(
		self as unknown as { MonacoEnvironment: Monaco.Environment }
	).MonacoEnvironment = {
		getWorker: () =>
			new Worker(new URL("./editor.worker.ts", import.meta.url), {
				type: "module",
			}),
	};
	for (const language of LANGUAGES) {
		monaco.languages.register({ id: languageId(language) });
		monaco.languages.setTokensProvider(
			languageId(language),
			createMonacoTokensProvider(language),
		);
	}
	monaco.editor.defineTheme("furnica-light", {
		base: "vs",
		inherit: true,
		rules: [
			{ token: "keyword", foreground: "0000ff", fontStyle: "bold" },
			{ token: "keyword.move", foreground: "7a3e9d", fontStyle: "bold" },
			{ token: "constant.condition", foreground: "0e7c86" },
			{ token: "number", foreground: "098658" },
			{ token: "identifier", foreground: "795e26" },
			{ token: "comment", foreground: "6a737d", fontStyle: "italic" },
			{ token: "invalid", foreground: "e00000", fontStyle: "underline" },
		],
		colors: {},
	});
	monaco.editor.defineTheme("furnica-dark", {
		base: "vs-dark",
		inherit: true,
		rules: [
			{ token: "keyword", foreground: "569cd6", fontStyle: "bold" },
			{ token: "keyword.move", foreground: "c586c0", fontStyle: "bold" },
			{ token: "constant.condition", foreground: "4ec9b0" },
			{ token: "number", foreground: "b5cea8" },
			{ token: "identifier", foreground: "dcdcaa" },
			{ token: "comment", foreground: "6a9955", fontStyle: "italic" },
			{ token: "invalid", foreground: "f44747", fontStyle: "underline" },
		],
		colors: {},
	});
}
