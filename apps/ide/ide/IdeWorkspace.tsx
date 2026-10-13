"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type * as monaco from "monaco-editor";
import {
	KEYWORD_SETS,
	parse,
	type Direction,
	type Language,
} from "@repo/ant-grammar";
import { moveAnt, type Point } from "@repo/ant-runtime";
import { Button } from "@/components/ui/button";
import { useDialogs } from "@/components/dialogs";
import { runtimeErrorMessage } from "@/i18n/errors";
import { MESSAGES } from "@/i18n/messages";
import { readSpeed, writeLanguage, writeSpeed } from "@/lib/preferences";
import { cn } from "@/lib/utils";
import type { Exercise, ExerciseStore } from "@/storage/exercise";
import { useAutosave } from "@/storage/useAutosave";
import { AntEditor } from "./editor/AntEditor";
import { EditorBoundary } from "./editor/EditorBoundary";
import { FileMenu } from "./files/FileMenu";
import { clearCell, isCellChar, placeObject, rotate } from "./grid/edit";
import { Grid } from "./grid/Grid";
import { GridControls } from "./grid/GridControls";
import { KeywordBar } from "./keywords/KeywordBar";
import { keywordInsertion, type KeywordButton } from "./keywords/insert";
import { delayFor } from "./run/run-controller";
import { useRunController } from "./run/useRunController";
import { ideReducer, initialState, taskOf } from "./state";
import { StatusBar } from "./StatusBar";
import { TaskPanel } from "./tasks/TaskPanel";
import { Toolbar } from "./Toolbar";
import { toolbarState } from "./toolbar-state";

type Panel = "program" | "grid";

export function IdeWorkspace({
	initial,
	store,
}: {
	initial: Exercise;
	store: ExerciseStore;
}) {
	const router = useRouter();
	const [state, dispatch] = useReducer(ideReducer, undefined, () =>
		initialState(initial, readSpeed()),
	);
	const { exercise, mode } = state;
	const { language } = exercise;
	const t = MESSAGES[language];
	const task = taskOf(exercise);
	const enabled = toolbarState(mode);
	const editing = mode === "setup" || mode === "done";
	const controller = useRunController(dispatch);
	const dialogs = useDialogs(t);
	const editor = useRef<monaco.editor.IStandaloneCodeEditor>(null);
	const [char, setChar] = useState("a");
	const [deleteMode, setDeleteMode] = useState(false);
	const [panel, setPanel] = useState<Panel>("program");

	useAutosave(store, exercise, 500, () => toast.error(t.notSaved));

	useEffect(() => {
		const timer = setTimeout(
			() =>
				dispatch({
					type: "set-diagnostics",
					diagnostics: parse(exercise.source, { language })
						.diagnostics,
				}),
			300,
		);
		return () => clearTimeout(timer);
	}, [exercise.source, language]);

	useEffect(() => {
		controller.setDelay(delayFor(state.speed));
		writeSpeed(state.speed);
	}, [controller, state.speed]);

	useEffect(() => {
		if (state.run?.error)
			toast.error(runtimeErrorMessage(state.run.error, language));
	}, [state.run?.error, language]);

	function parseNow() {
		const result = parse(exercise.source, { language });
		dispatch({ type: "set-diagnostics", diagnostics: result.diagnostics });
		return result;
	}

	/** Starts a run from the start world; false when the program has errors. */
	function begin(paused: boolean): boolean {
		const { program, diagnostics } = parseNow();
		if (!program) {
			toast.error(t.syntaxErrors(diagnostics.length));
			return false;
		}
		dispatch({ type: "start-run", paused });
		controller.start(program, exercise.start, {
			delay: delayFor(state.speed),
			paused,
		});
		return true;
	}

	const actions = {
		onNew: async () => {
			if (await dialogs.confirm(t.confirmNew)) router.push("/ide");
		},
		onCheck: () => {
			const { diagnostics } = parseNow();
			if (diagnostics.length === 0) toast.success(t.syntaxOk);
			else toast.error(t.syntaxErrors(diagnostics.length));
		},
		onRun: () => {
			if (mode === "paused") {
				dispatch({ type: "resume" });
				controller.resume();
			} else begin(false);
		},
		onStep: () => {
			if (mode === "paused") controller.stepOnce();
			else if (begin(true)) controller.stepOnce();
		},
		onStop: () => {
			controller.stop();
			dispatch({ type: "stop" });
		},
		onReset: () => {
			controller.stop();
			dispatch({ type: "reset" });
		},
		onSpeed: (speed: number) => dispatch({ type: "set-speed", speed }),
		onLanguage: async (next: Language) => {
			if (next === language) return;
			if (
				exercise.source.trim() !== "" &&
				!(await dialogs.confirm(t.confirmLanguage))
			)
				return;
			dispatch({ type: "set-language", language: next });
			writeLanguage(next);
		},
	};

	function onCellClick(p: Point) {
		if (!editing) return;
		if (!deleteMode && !isCellChar(char)) {
			toast.error(t.invalidCharacter);
			return;
		}
		const start = exercise.start;
		dispatch({
			type: "set-start",
			world: deleteMode
				? clearCell(start, p)
				: placeObject(start, p, char),
		});
	}

	function onMove(direction: Direction) {
		const { world, outcome } = moveAnt(exercise.start, direction);
		if (!outcome.ok) {
			const range = {
				start: { line: 1, column: 1, offset: 0 },
				end: { line: 1, column: 1, offset: 0 },
			};
			toast.error(runtimeErrorMessage({ ...outcome, range }, language));
		}
		dispatch({ type: "set-start", world });
	}

	function onInsert(button: KeywordButton) {
		const e = editor.current;
		const model = e?.getModel();
		const position = e?.getPosition();
		if (!e || !model || !position) return;
		const ins = keywordInsertion(
			button,
			KEYWORD_SETS[language],
			model.getLineContent(position.lineNumber),
			position.lineNumber,
		);
		e.executeEdits("keyword", [
			{
				range: {
					startLineNumber: ins.line,
					startColumn: ins.column,
					endLineNumber: ins.line,
					endColumn: ins.column,
				},
				text: ins.text,
			},
		]);
		e.setPosition({ lineNumber: ins.caret.line, column: ins.caret.column });
		e.focus();
	}

	const showGoal = mode === "done" && state.goalCheck;

	return (
		<div className="flex h-dvh flex-col">
			<Toolbar
				t={t}
				enabled={enabled}
				speed={state.speed}
				language={language}
				actions={actions}
				fileMenu={
					<FileMenu
						t={t}
						disabled={!enabled.file}
						exercise={exercise}
						dialogs={dialogs}
						onOpened={(file) =>
							dispatch({ type: "replace-content", ...file })
						}
					/>
				}
			/>
			<nav className="flex gap-1 border-b p-1 lg:hidden">
				{(["program", "grid"] as const).map((p) => (
					<Button
						key={p}
						size="sm"
						variant={panel === p ? "secondary" : "ghost"}
						onClick={() => setPanel(p)}
					>
						{t[p]}
					</Button>
				))}
			</nav>
			<main className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_auto_18rem]">
				<section
					className={cn(
						"flex min-h-0 flex-col gap-2",
						panel !== "program" && "hidden lg:flex",
					)}
				>
					<KeywordBar
						set={KEYWORD_SETS[language]}
						disabled={!editing}
						onInsert={onInsert}
					/>
					<div className="min-h-64 flex-1 overflow-hidden rounded-md border">
						<EditorBoundary
							fallback={(retry) => (
								<div className="flex h-full flex-col items-center justify-center gap-2 text-sm">
									{t.editorFailed}
									<Button size="sm" onClick={retry}>
										{t.retry}
									</Button>
								</div>
							)}
						>
							<AntEditor
								value={exercise.source}
								language={language}
								readOnly={!editing}
								diagnostics={state.diagnostics}
								runError={state.run?.error}
								current={state.run?.current}
								onChange={(source) =>
									dispatch({ type: "edit-source", source })
								}
								onEditor={(e) => {
									editor.current = e;
								}}
							/>
						</EditorBoundary>
					</div>
				</section>
				<section
					className={cn(
						"flex flex-col items-start gap-3",
						panel !== "grid" && "hidden lg:flex",
					)}
				>
					<Grid
						label={t.grid}
						objects={state.world.objects}
						ant={{
							point: state.world.ant,
							facing: state.world.facing,
						}}
						missing={showGoal ? state.goalCheck!.missing : []}
						misplaced={showGoal ? state.goalCheck!.misplaced : []}
						onCellClick={onCellClick}
					/>
					<GridControls
						t={t}
						disabled={!editing}
						char={char}
						onCharChange={setChar}
						deleteMode={deleteMode}
						onDeleteModeChange={setDeleteMode}
						onMove={onMove}
						onRotate={() =>
							dispatch({
								type: "set-start",
								world: rotate(exercise.start),
							})
						}
					/>
				</section>
				{task && (
					<aside
						className={cn(panel !== "grid" && "hidden lg:block")}
					>
						<TaskPanel t={t} task={task} check={state.goalCheck} />
					</aside>
				)}
			</main>
			<StatusBar t={t} state={state} />
			{dialogs.element}
		</div>
	);
}
