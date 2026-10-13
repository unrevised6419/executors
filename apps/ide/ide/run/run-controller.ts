import type { Program, Range } from "@repo/ant-grammar";
import { Run, type Step, type World } from "@repo/ant-runtime";
import type { StepReport } from "@/ide/state";

/** Steps per timer tick at the fastest speed, so endless runs never freeze the page. */
export const BATCH_STEPS = 500;

/** The original's speed scale: slider position 0..20, 200 − 10·position ms per step. */
export function delayFor(speed: number): number {
	return 200 - 10 * speed;
}

const rangeOf = (step: Step): Range =>
	step.kind === "error" ? step.error.range : step.range;

/** Drives one `Run` on a timer and reports the grid after each tick. */
export class RunController {
	readonly #report: (report: StepReport) => void;
	#run: Run | undefined;
	#timer: ReturnType<typeof setTimeout> | undefined;
	#delay = 100;
	#paused = false;

	constructor(report: (report: StepReport) => void) {
		this.#report = report;
	}

	start(
		program: Program,
		world: World,
		options: { delay: number; paused: boolean },
	): void {
		this.stop();
		this.#run = new Run(program, { world });
		this.#delay = options.delay;
		this.#paused = options.paused;
		if (!this.#paused) this.#schedule();
	}

	setDelay(ms: number): void {
		this.#delay = ms;
	}

	pause(): void {
		this.#paused = true;
		this.#clear();
	}

	resume(): void {
		if (this.#run?.status !== "running") return;
		this.#paused = false;
		this.#schedule();
	}

	stepOnce(): void {
		if (this.#run?.status === "running") this.#advance(1);
	}

	stop(): void {
		this.#clear();
		this.#run = undefined;
	}

	#schedule(): void {
		this.#clear();
		this.#timer = setTimeout(() => {
			this.#timer = undefined;
			this.#advance(this.#delay === 0 ? BATCH_STEPS : 1);
			if (!this.#paused && this.#run?.status === "running")
				this.#schedule();
		}, this.#delay);
	}

	#clear(): void {
		if (this.#timer !== undefined) clearTimeout(this.#timer);
		this.#timer = undefined;
	}

	#advance(count: number): void {
		const run = this.#run;
		if (!run) return;
		let last: Step | undefined;
		for (let i = 0; i < count && run.status === "running"; i++)
			last = run.step();
		this.#report({
			world: run.world,
			steps: run.steps,
			current: last && rangeOf(last),
			status: run.status,
			error: run.error,
		});
	}
}
