/**
 * Static rules that the grammar alone does not express.
 *
 * - Procedure names start with a letter and are unique.
 * - Every call names a defined procedure. Procedures may be called before
 *   their definition and may call each other, recursively included.
 * - A REPEAT count fits in 32 bits.
 */

import type { Branch, Program, Statement } from "./ast.ts";
import { MAX_REPEAT_COUNT, type Diagnostic } from "./diagnostics.ts";
import { sameWord } from "./text.ts";

export function validate(program: Program, source: string): Diagnostic[] {
	const diagnostics: Diagnostic[] = [];
	const defined: Program["procedures"][number][] = [];

	for (const procedure of program.procedures) {
		const { name } = procedure;
		if (!/^\p{L}/u.test(name.text)) {
			diagnostics.push({
				code: "invalid-name",
				name: name.text,
				range: name.range,
			});
		}
		const first = defined.find((p) => sameWord(p.name.text, name.text));
		if (first === undefined) defined.push(procedure);
		else {
			diagnostics.push({
				code: "duplicate-procedure",
				name: name.text,
				first: first.name.range,
				range: name.range,
			});
		}
	}

	const visitBranch = (branch: Branch): void => {
		if (
			branch.kind === "call" &&
			!defined.some((p) => sameWord(p.name.text, branch.name.text))
		) {
			diagnostics.push({
				code: "undefined-procedure",
				name: branch.name.text,
				range: branch.name.range,
			});
		}
	};

	const visit = (statements: readonly Statement[]): void => {
		for (const statement of statements) {
			switch (statement.kind) {
				case "move":
				case "call":
					visitBranch(statement);
					break;
				case "if":
					visitBranch(statement.then);
					if (statement.else !== undefined)
						visitBranch(statement.else);
					break;
				case "repeat":
					if (statement.count > MAX_REPEAT_COUNT) {
						diagnostics.push({
							code: "count-too-large",
							text: source.slice(
								statement.countRange.start.offset,
								statement.countRange.end.offset,
							),
							range: statement.countRange,
						});
					}
					visit(statement.body);
					break;
				case "while":
					visit(statement.body);
					break;
			}
		}
	};

	for (const procedure of program.procedures) visit(procedure.body);
	visit(program.body);

	return diagnostics.sort(
		(a, b) => a.range.start.offset - b.range.start.offset,
	);
}
