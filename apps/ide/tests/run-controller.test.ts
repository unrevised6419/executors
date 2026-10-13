import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { parse } from "@repo/ant-grammar";
import { INITIAL_WORLD, type World } from "@repo/ant-runtime";
import { BATCH_STEPS, delayFor, RunController } from "@/ide/run/run-controller";
import type { StepReport } from "@/ide/state";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const program = (source: string) => parse(source, { language: "ro" }).program!;
const THREE = program("INCEPUT\nDREAPTA\nDREAPTA\nDREAPTA\nSFIRSIT");
// Right, left, forever: the ant is never at the edge.
const ENDLESS = program(
	"INCEPUT\nCIT NU_E_MARGINE EXECUTA\nDREAPTA\nSTINGA\nSFIRSIT CIT\nSFIRSIT",
);
const MIDDLE: World = { ...INITIAL_WORLD, ant: { x: 5, y: 5 } };

function controller() {
	const reports: StepReport[] = [];
	return { reports, c: new RunController((r) => reports.push(r)) };
}

test("delayFor follows the original's scale", () => {
	expect([0, 10, 20].map(delayFor)).toEqual([200, 100, 0]);
});

test("steps once per delay and stops at the end", () => {
	const { reports, c } = controller();
	c.start(THREE, INITIAL_WORLD, { delay: 100, paused: false });
	vi.advanceTimersByTime(99);
	expect(reports).toHaveLength(0);
	vi.advanceTimersByTime(1);
	expect(reports.at(-1)).toMatchObject({
		steps: 1,
		world: { ant: { x: 2, y: 1 } },
	});
	vi.advanceTimersByTime(1000);
	expect(reports.at(-1)).toMatchObject({ steps: 3, status: "finished" });
	expect(reports.at(-1)!.current).toEqual(
		expect.objectContaining({
			start: expect.objectContaining({ line: 4 }),
		}),
	);
	expect(vi.getTimerCount()).toBe(0);
});

test("at delay 0 runs a batch per tick and stop halts at once", () => {
	const { reports, c } = controller();
	c.start(ENDLESS, MIDDLE, { delay: 0, paused: false });
	vi.advanceTimersToNextTimer();
	expect(reports.at(-1)!.steps).toBe(BATCH_STEPS);
	c.stop();
	vi.advanceTimersByTime(10_000);
	expect(reports).toHaveLength(1);
	expect(vi.getTimerCount()).toBe(0);
});

test("a paused run moves only on stepOnce, and resume continues", () => {
	const { reports, c } = controller();
	c.start(THREE, INITIAL_WORLD, { delay: 100, paused: true });
	vi.advanceTimersByTime(1000);
	expect(reports).toHaveLength(0);
	c.stepOnce();
	expect(reports.at(-1)!.steps).toBe(1);
	c.resume();
	vi.advanceTimersByTime(1000);
	expect(reports.at(-1)!.status).toBe("finished");
});

test("reports a runtime error with its range", () => {
	const { reports, c } = controller();
	c.start(program("INCEPUT\nSUS\nSFIRSIT"), INITIAL_WORLD, {
		delay: 0,
		paused: false,
	});
	vi.advanceTimersToNextTimer();
	expect(reports.at(-1)).toMatchObject({
		status: "failed",
		error: { code: "wall" },
	});
	expect(reports.at(-1)!.current?.start.line).toBe(2);
});
