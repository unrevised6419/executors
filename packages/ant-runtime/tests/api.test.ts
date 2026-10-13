import { describe, expect, test } from "vitest";
import { parse, type Range } from "@repo/ant-grammar";
import {
	checkWorld,
	INITIAL_WORLD,
	isObjectChar,
	Run,
	type Step,
} from "../src/index.ts";

function program(source: string) {
	const { program, diagnostics } = parse(source, { language: "ro" });
	expect(diagnostics).toEqual([]);
	return program!;
}

const at = (r: Range | undefined) => r && `${r.start.line}:${r.start.column}`;

describe("Run", () => {
	test("steps one statement at a time", () => {
		const run = new Run(
			program(
				"PROCEDURA P\n  DACA NU_E_MARGINE ATUNCI DREAPTA\nSFIRSIT PROCEDURA\nINCEPUT\nREPETA 2 ORI\n  P\nSFIRSIT REPETA\nSFIRSIT",
			),
		);
		const trace: string[] = [];
		for (;;) {
			const next = at(run.next);
			const step = run.step();
			if (step === undefined) break;
			expect(step.kind === "error" ? undefined : at(step.range)).toBe(
				next,
			);
			trace.push(`${step.kind}@${next}`);
		}
		expect(trace).toEqual([
			"repeat@5:1",
			"call@6:3",
			"test@2:3",
			"move@2:28",
			"call@6:3",
			"test@2:3",
			"move@2:28",
		]);
		expect(run.status).toBe("finished");
		expect(run.next).toBeUndefined();
		expect(run.world.ant).toEqual({ x: 3, y: 1 });
	});

	test("reports moves and pushes", () => {
		const run = new Run(program("INCEPUT\nDREAPTA\nSFIRSIT"), {
			world: { ...INITIAL_WORLD, objects: [{ x: 2, y: 1, char: "A" }] },
		});
		expect(run.step()).toMatchObject({
			kind: "move",
			direction: "right",
			from: { x: 1, y: 1 },
			to: { x: 2, y: 1 },
			push: { char: "A", from: { x: 2, y: 1 }, to: { x: 3, y: 1 } },
		} satisfies Partial<Step>);
		expect(run.world.objects).toEqual([{ x: 3, y: 1, char: "A" }]);
	});

	test("finishes as soon as the last statement has run", () => {
		const run = new Run(program("INCEPUT\nDREAPTA\nSFIRSIT"));
		expect(run.status).toBe("running");
		run.step();
		expect(run.status).toBe("finished");
		expect(run.step()).toBeUndefined();
	});

	test("an empty program is finished before any step", () => {
		expect(new Run(program("INCEPUT\nSFIRSIT")).status).toBe("finished");
	});

	test("stops on the first error", () => {
		const run = new Run(program("INCEPUT\nSUS\nDREAPTA\nSFIRSIT"));
		expect(run.step()).toMatchObject({
			kind: "error",
			error: { code: "wall" },
		});
		expect(run.status).toBe("failed");
		expect(run.error?.code).toBe("wall");
		expect(run.step()).toBeUndefined();
		expect(run.world.facing).toBe("up");
	});

	test("exposes the call stack", () => {
		const run = new Run(
			program(
				"PROCEDURA A\n  B\nSFIRSIT PROCEDURA\nPROCEDURA B\n  JOS\nSFIRSIT PROCEDURA\nINCEPUT\nA\nSFIRSIT",
			),
		);
		run.step();
		run.step();
		expect(run.callStack.map((e) => [e.procedure, at(e.call)])).toEqual([
			["A", "8:1"],
			["B", "2:3"],
		]);
		run.step();
		expect(run.callStack).toEqual([]);
	});

	test("does not change the world it started from", () => {
		const world = {
			...INITIAL_WORLD,
			objects: [{ x: 1, y: 2, char: "A" }],
		};
		new Run(program("INCEPUT\nJOS\nSFIRSIT"), { world }).finish();
		expect(world.objects).toEqual([{ x: 1, y: 2, char: "A" }]);
	});

	test("refuses an invalid world", () => {
		expect(
			() =>
				new Run(program("INCEPUT\nSFIRSIT"), {
					world: { ...INITIAL_WORLD, ant: { x: 0, y: 1 } },
				}),
		).toThrow(RangeError);
	});
});

describe("checkWorld", () => {
	test("accepts the initial world", () => {
		expect(checkWorld(INITIAL_WORLD)).toEqual([]);
	});

	test("lists every problem", () => {
		const problems = checkWorld({
			ant: { x: 1, y: 11 },
			facing: "north" as never,
			objects: [
				{ x: 2, y: 2, char: "AB" },
				{ x: 2, y: 2, char: "C" },
				{ x: 0, y: 2, char: "D" },
				{ x: 3, y: 3, char: " " },
			],
		});
		expect(problems.map((p) => p.code)).toEqual([
			"ant-outside-grid",
			"invalid-facing",
			"invalid-object",
			"duplicate-cell",
			"object-outside-grid",
			"invalid-object",
		]);
		expect(
			checkWorld({
				...INITIAL_WORLD,
				objects: [{ x: 1, y: 1, char: "A" }],
			}).map((p) => p.code),
		).toEqual(["object-under-ant"]);
	});
});

describe("isObjectChar", () => {
	test("is one visible character", () => {
		for (const ok of ["A", "ă", "Ж", "*", "👍", "é", "👩‍👩‍👧"])
			expect(isObjectChar(ok), ok).toBe(true);
		for (const bad of ["", " ", "\t", "AB", " "])
			expect(isObjectChar(bad), JSON.stringify(bad)).toBe(false);
	});
});
