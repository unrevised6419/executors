"use client";

import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import type { Diagnostic, Language, Range } from "@repo/ant-grammar";
import type { RuntimeError } from "@repo/ant-runtime";
import { diagnosticMessage, runtimeErrorMessage } from "@/i18n/errors";
import { languageId, setupMonaco } from "./monaco-setup";

// Use the bundled Monaco, never the CDN, so the IDE works offline.
loader.config({ monaco });
setupMonaco(monaco);

function marker(range: Range, message: string): monaco.editor.IMarkerData {
	const empty =
		range.end.line === range.start.line &&
		range.end.column <= range.start.column;
	return {
		startLineNumber: range.start.line,
		startColumn: range.start.column,
		endLineNumber: range.end.line,
		endColumn: empty ? range.start.column + 1 : range.end.column,
		message,
		severity: monaco.MarkerSeverity.Error,
	};
}

const toMonaco = (r: Range) =>
	new monaco.Range(r.start.line, r.start.column, r.end.line, r.end.column);

export function AntEditor({
	value,
	revision,
	language,
	readOnly,
	diagnostics,
	runError,
	current,
	onChange,
	onEditor,
}: {
	value: string;
	/** Changes when `value` is replaced from outside; typing never changes it. */
	revision: number;
	language: Language;
	readOnly: boolean;
	diagnostics: readonly Diagnostic[];
	runError: RuntimeError | undefined;
	current: Range | undefined;
	onChange: (value: string) => void;
	onEditor?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
}) {
	const { resolvedTheme } = useTheme();
	const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor>();
	const decorations =
		useRef<monaco.editor.IEditorDecorationsCollection>(undefined);

	// The editor owns its text while the user types, so a render that lags
	// behind the keystrokes can never overwrite it. `value` is only pushed in
	// when `revision` says it was replaced from outside.
	const valueRef = useRef(value);
	useEffect(() => {
		valueRef.current = value;
	}, [value]);

	useEffect(() => {
		const model = editor?.getModel();
		if (!editor || !model || model.getValue() === valueRef.current) return;
		editor.pushUndoStop();
		editor.executeEdits("external", [
			{ range: model.getFullModelRange(), text: valueRef.current },
		]);
		editor.pushUndoStop();
	}, [editor, revision]);

	const onChangeRef = useRef(onChange);
	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);
	const handleChange = useCallback(
		(v: string | undefined) => onChangeRef.current(v ?? ""),
		[],
	);
	const options = useMemo<monaco.editor.IStandaloneEditorConstructionOptions>(
		() => ({
			readOnly,
			minimap: { enabled: false },
			fontSize: 14,
			tabSize: 2,
			insertSpaces: true,
			automaticLayout: true,
			scrollBeyondLastLine: false,
			quickSuggestions: false,
			wordBasedSuggestions: "off",
		}),
		[readOnly],
	);

	useEffect(() => {
		const model = editor?.getModel();
		if (!model) return;
		monaco.editor.setModelMarkers(model, "furnica", [
			...diagnostics.map((d) =>
				marker(d.range, diagnosticMessage(d, language)),
			),
			...(runError
				? [
						marker(
							runError.range,
							runtimeErrorMessage(runError, language),
						),
					]
				: []),
		]);
	}, [editor, diagnostics, runError, language]);

	useEffect(() => {
		if (!editor) return;
		decorations.current ??= editor.createDecorationsCollection();
		if (!current) {
			decorations.current.clear();
			return;
		}
		decorations.current.set([
			{
				range: toMonaco(current),
				options: { inlineClassName: "furnica-current" },
			},
			{
				range: toMonaco(current),
				options: {
					isWholeLine: true,
					className: "furnica-current-line",
				},
			},
		]);
		editor.revealLineInCenterIfOutsideViewport(current.start.line);
	}, [editor, current]);

	return (
		<Editor
			height="100%"
			language={languageId(language)}
			theme={resolvedTheme === "dark" ? "furnica-dark" : "furnica-light"}
			defaultValue={value}
			onChange={handleChange}
			onMount={(e: monaco.editor.IStandaloneCodeEditor) => {
				setEditor(e);
				onEditor?.(e);
			}}
			options={options}
		/>
	);
}
