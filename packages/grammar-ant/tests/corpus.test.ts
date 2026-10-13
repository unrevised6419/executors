/**
 * Runs every program in `corpus/`. Each `name.antp` holds the source and
 * `name.json` the expectation: either `ast` (the program is valid and parses
 * to this tree) or `errors` (the diagnostics, matched on the listed fields).
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, test } from "vitest";
import {
	parse,
	type Branch,
	type Diagnostic,
	type Language,
	type Program,
	type Statement,
} from "../src/index.ts";

interface Expectation {
	readonly description: string;
	readonly language: Language;
	readonly spec?: string;
	readonly ast?: unknown;
	readonly errors?: readonly ({
		code: string;
		line: number;
		column: number;
	} & Record<string, unknown>)[];
}

const root = join(import.meta.dirname, "corpus");

function* sources(dir: string): Generator<string> {
	for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
		a.name.localeCompare(b.name),
	)) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) yield* sources(path);
		else if (entry.name.endsWith(".antp")) yield path;
	}
}

/** The AST without positions, in the compact form used by the corpus. */
function plain(program: Program): unknown {
	const branch = (b: Branch): unknown =>
		b.kind === "move" ? b.direction : { call: b.name.text };
	const statement = (s: Statement): unknown => {
		switch (s.kind) {
			case "move":
			case "call":
				return branch(s);
			case "if":
				return {
					if: s.condition,
					then: branch(s.then),
					...(s.else === undefined ? {} : { else: branch(s.else) }),
				};
			case "repeat":
				return { repeat: s.count, body: s.body.map(statement) };
			case "while":
				return { while: s.condition, body: s.body.map(statement) };
		}
	};
	return {
		procedures: program.procedures.map((p) => ({
			name: p.name.text,
			body: p.body.map(statement),
		})),
		body: program.body.map(statement),
	};
}

function summary(d: Diagnostic): Record<string, unknown> {
	const { range, ...rest } = d;
	return { ...rest, line: range.start.line, column: range.start.column };
}

describe("corpus", () => {
	for (const path of sources(root)) {
		const name = relative(root, path).replace(/\.antp$/, "");
		const expected = JSON.parse(
			readFileSync(path.replace(/\.antp$/, ".json"), "utf8"),
		) as Expectation;
		test(`${name}: ${expected.description}`, () => {
			const result = parse(readFileSync(path, "utf8"), {
				language: expected.language,
			});
			if (expected.ast !== undefined) {
				expect(result.diagnostics.map(summary)).toEqual([]);
				expect(plain(result.program!)).toEqual(expected.ast);
			} else {
				expect(result.program).toBeUndefined();
				expect(result.diagnostics.map(summary)).toMatchObject(
					expected.errors ?? [],
				);
				expect(result.diagnostics).toHaveLength(
					expected.errors?.length ?? 0,
				);
			}
		});
	}
});
