/**
 * Abstract syntax tree.
 *
 * Every node carries the source range it came from. Positions follow the
 * Monaco editor convention: lines and columns are 1-based, `end` is
 * exclusive, and columns count UTF-16 code units.
 */

export interface Position {
	readonly line: number;
	readonly column: number;
	/** 0-based offset into the source. */
	readonly offset: number;
}

export interface Range {
	readonly start: Position;
	readonly end: Position;
}

export type Direction = "up" | "down" | "left" | "right";

/** The ant is facing the edge of the grid, or it is not. */
export type Condition = "atEdge" | "notAtEdge";

export interface Name {
	/** The name as written. Compare names with `sameWord`, never with `===`. */
	readonly text: string;
	readonly range: Range;
}

export interface Move {
	readonly kind: "move";
	readonly direction: Direction;
	readonly range: Range;
}

/** A procedure call: the bare procedure name on its own line. */
export interface Call {
	readonly kind: "call";
	readonly name: Name;
	readonly range: Range;
}

/** What an IF branch may run: one move or one call. */
export type Branch = Move | Call;

/** `IF cond THEN branch [ELSE branch]`, all on one line. */
export interface If {
	readonly kind: "if";
	readonly condition: Condition;
	readonly then: Branch;
	readonly else: Branch | undefined;
	readonly range: Range;
}

/** `REPEAT n TIMES` … `END REPEAT` */
export interface Repeat {
	readonly kind: "repeat";
	readonly count: number;
	readonly countRange: Range;
	/** The `REPEAT n TIMES` line. */
	readonly header: Range;
	readonly body: readonly Statement[];
	readonly range: Range;
}

/** `WHILE cond DO` … `END WHILE` */
export interface While {
	readonly kind: "while";
	readonly condition: Condition;
	/** The `WHILE cond DO` line. */
	readonly header: Range;
	readonly body: readonly Statement[];
	readonly range: Range;
}

export type Statement = Move | Call | If | Repeat | While;

/** `PROC name` … `END PROC` */
export interface Procedure {
	readonly kind: "procedure";
	readonly name: Name;
	/** The `PROC name` line. */
	readonly header: Range;
	readonly body: readonly Statement[];
	readonly range: Range;
}

/** Procedure definitions, then `BEGIN` … `END`. */
export interface Program {
	readonly kind: "program";
	readonly procedures: readonly Procedure[];
	readonly body: readonly Statement[];
	readonly range: Range;
}
