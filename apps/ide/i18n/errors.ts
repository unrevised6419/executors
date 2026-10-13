import {
	formatMessage,
	KEYWORD_SETS,
	MAX_REPEAT_COUNT,
	type BlockKind,
	type Diagnostic,
	type Expectation,
	type KeywordSet,
	type Language,
} from "@repo/ant-grammar";
import type { RuntimeError } from "@repo/ant-runtime";

interface Words {
	newline: string;
	name: string;
	number: string;
	eof: string;
	nothing: string;
	or: string;
}

const WORDS: Record<"ro" | "ru", Words> = {
	ro: {
		newline: "sfârșitul rândului",
		name: "un nume de procedură",
		number: "un număr",
		eof: "sfârșitul fișierului",
		nothing: "nimic",
		or: "sau",
	},
	ru: {
		newline: "конец строки",
		name: "имя процедуры",
		number: "число",
		eof: "конец файла",
		nothing: "ничего",
		or: "или",
	},
};

const BLOCK_ROLE = {
	repeat: "REPEAT",
	while: "WHILE",
	procedure: "PROC",
	program: undefined,
} as const;

function show(set: KeywordSet, w: Words, e: Expectation): string {
	if (e === "newline") return w.newline;
	if (e === "name") return w.name;
	if (e === "number") return w.number;
	if (e === "end of file") return w.eof;
	return set.keywords[e];
}

function closer(set: KeywordSet, block: BlockKind): string {
	const role = BLOCK_ROLE[block];
	return role === undefined
		? set.keywords.END
		: `${set.keywords.END} ${set.keywords[role]}`;
}

function list(items: string[], w: Words): string {
	if (items.length <= 1) return items[0] ?? w.nothing;
	return `${items.slice(0, -1).join(", ")} ${w.or} ${items.at(-1)}`;
}

/** A diagnostic in the student's language, with keywords in the program's language. */
export function diagnosticMessage(d: Diagnostic, language: Language): string {
	const set = KEYWORD_SETS[language];
	if (language === "en") return formatMessage(d, set);
	const w = WORDS[language];
	const q = (s: string) => (language === "ro" ? `„${s}”` : `«${s}»`);
	const ro = language === "ro";
	switch (d.code) {
		case "invalid-character":
			return ro
				? `Caracter nepermis ${q(d.text)}.`
				: `Недопустимый символ ${q(d.text)}.`;
		case "unexpected": {
			const expected = list(
				d.expected.map((e) => show(set, w, e)),
				w,
			);
			const found = d.text === "" ? show(set, w, d.found) : q(d.text);
			return ro
				? `Se aștepta ${expected}, dar este ${found}.`
				: `Ожидалось ${expected}, а найдено ${found}.`;
		}
		case "reserved-word":
			return ro
				? `${q(d.text)} este un cuvânt cheie și nu poate fi nume de procedură.`
				: `${q(d.text)} — ключевое слово, оно не может быть именем процедуры.`;
		case "trailing-text":
			return ro
				? `${q(d.text)} în plus: pe un rând este o singură instrucțiune.`
				: `Лишнее ${q(d.text)}: в строке может быть только одна команда.`;
		case "missing-end":
			return ro
				? `Lipsește ${closer(set, d.block)}.`
				: `Не хватает ${closer(set, d.block)}.`;
		case "mismatched-end":
			return ro
				? `Se aștepta ${closer(set, d.block)}, dar este ${q(d.text)}.`
				: `Ожидалось ${closer(set, d.block)}, а найдено ${q(d.text)}.`;
		case "invalid-statement":
			return ro
				? `Cu ${q(d.text)} nu poate începe o instrucțiune.`
				: `С ${q(d.text)} не может начинаться команда.`;
		case "misplaced-procedure":
			return ro
				? `Procedurile se definesc înainte de ${set.keywords.BEGIN}, în afara altor blocuri.`
				: `Процедуры определяются до ${set.keywords.BEGIN}, вне других блоков.`;
		case "missing-begin":
			return ro
				? `Lipsește ${set.keywords.BEGIN}.`
				: `Не хватает ${set.keywords.BEGIN}.`;
		case "code-after-end":
			return ro
				? `După ${set.keywords.END} nu mai poate urma nimic.`
				: `После ${set.keywords.END} ничего не может быть.`;
		case "duplicate-procedure":
			return ro
				? `Procedura ${q(d.name)} este deja definită pe rândul ${d.first.start.line}.`
				: `Процедура ${q(d.name)} уже определена в строке ${d.first.start.line}.`;
		case "undefined-procedure":
			return ro
				? `Procedura ${q(d.name)} nu există.`
				: `Процедура ${q(d.name)} не найдена.`;
		case "invalid-name":
			return ro
				? `${q(d.name)} nu este un nume valid: trebuie să înceapă cu o literă.`
				: `${q(d.name)} — недопустимое имя: оно должно начинаться с буквы.`;
		case "count-too-large":
			return ro
				? `Numărul ${d.text} este prea mare; maximul este ${MAX_REPEAT_COUNT}.`
				: `Число ${d.text} слишком большое; максимум ${MAX_REPEAT_COUNT}.`;
	}
}

/** A runtime error in the student's language. */
export function runtimeErrorMessage(
	e: RuntimeError,
	language: Language,
): string {
	const q = (s: string) =>
		language === "ro" ? `„${s}”` : language === "ru" ? `«${s}»` : `"${s}"`;
	const text = {
		en: {
			wall: () => "The ant cannot leave the grid.",
			off: (c: string) => `${q(c)} would be pushed off the grid.`,
			blocked: (a: string, b: string) =>
				`${q(a)} cannot be pushed: ${q(b)} is behind it.`,
			steps: (n: number) =>
				`The program ran ${n} steps without ending. Does it loop forever?`,
			depth: (n: number) =>
				`Procedures called each other ${n} levels deep. Does a procedure call itself without end?`,
			proc: (name: string) => `Unknown procedure ${q(name)}.`,
		},
		ro: {
			wall: () => "Furnica nu poate ieși din teren.",
			off: (c: string) => `${q(c)} ar fi împins în afara terenului.`,
			blocked: (a: string, b: string) =>
				`${q(a)} nu poate fi împins: în spatele lui este ${q(b)}.`,
			steps: (n: number) =>
				`Programul a făcut ${n} pași fără să se termine. Are o buclă infinită?`,
			depth: (n: number) =>
				`Procedurile s-au apelat una pe alta pe ${n} niveluri. O procedură se apelează la nesfârșit?`,
			proc: (name: string) => `Procedura ${q(name)} nu există.`,
		},
		ru: {
			wall: () => "Муравей не может выйти за поле.",
			off: (c: string) => `${q(c)} был бы вытолкнут за поле.`,
			blocked: (a: string, b: string) =>
				`${q(a)} нельзя толкнуть: за ним ${q(b)}.`,
			steps: (n: number) =>
				`Программа сделала ${n} шагов и не закончилась. Нет ли бесконечного цикла?`,
			depth: (n: number) =>
				`Процедуры вызвали друг друга на глубину ${n}. Нет ли бесконечной рекурсии?`,
			proc: (name: string) => `Процедура ${q(name)} не найдена.`,
		},
	}[language];
	switch (e.code) {
		case "wall":
			return text.wall();
		case "push-off-grid":
			return text.off(e.object.char);
		case "push-blocked":
			return text.blocked(e.object.char, e.blocker.char);
		case "step-limit":
			return text.steps(e.limit);
		case "depth-limit":
			return text.depth(e.limit);
		case "undefined-procedure":
			return text.proc(e.name);
	}
}
