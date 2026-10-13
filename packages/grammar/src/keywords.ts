/**
 * Keyword roles and the keyword set of each language.
 *
 * The language is defined over roles, not spellings (spec-ant §2.2). A
 * program is written in exactly one language; its words are matched against
 * that language's keywords with the comparison in `text.ts`, so case and
 * diacritics are ignored (`SFIRSIT` = `sfîrșit` = `SFÂRȘIT` via the alias).
 *
 * End markers are not roles of their own: `END_REPEAT` is the two words
 * `END REPEAT`, `END_WHILE` is `END WHILE` and `END_PROC` is `END PROC`, as in
 * the original (spec-ant §2.2, constraints between roles).
 */

export const ROLES = [
	"BEGIN",
	"END",
	"UP",
	"DOWN",
	"LEFT",
	"RIGHT",
	"REPEAT",
	"TIMES",
	"WHILE",
	"DO",
	"IF",
	"THEN",
	"ELSE",
	"PROC",
	"AT_EDGE",
	"NOT_AT_EDGE",
] as const;

export type Role = (typeof ROLES)[number];

export const LANGUAGES = ["ro", "en", "ru"] as const;

export type Language = (typeof LANGUAGES)[number];

export interface KeywordSet {
	readonly language: Language;
	/** The spelling shown to users, used in messages and completions. */
	readonly keywords: Readonly<Record<Role, string>>;
	/** Extra accepted spellings, matched exactly like the main one. */
	readonly aliases: Readonly<Partial<Record<Role, readonly string[]>>>;
}

/** Romanian: the original spellings (spec-ant §2.2, §2.3). */
const ro: KeywordSet = {
	language: "ro",
	keywords: {
		BEGIN: "INCEPUT",
		END: "SFIRSIT",
		UP: "SUS",
		DOWN: "JOS",
		LEFT: "STINGA",
		RIGHT: "DREAPTA",
		REPEAT: "REPETA",
		TIMES: "ORI",
		WHILE: "CIT",
		DO: "EXECUTA",
		IF: "DACA",
		THEN: "ATUNCI",
		ELSE: "ALTFEL",
		PROC: "PROCEDURA",
		AT_EDGE: "E_MARGINE",
		NOT_AT_EDGE: "NU_E_MARGINE",
	},
	// Post-1993 orthography writes â where the original writes i. Diacritics
	// are already ignored, so only the base letter differs: SFÂRȘIT -> SFARSIT.
	aliases: {
		END: ["SFARSIT"],
		LEFT: ["STANGA"],
		WHILE: ["CAT"],
	},
};

/** English: proposal (spec-ant §2.4). */
const en: KeywordSet = {
	language: "en",
	keywords: {
		BEGIN: "BEGIN",
		END: "END",
		UP: "UP",
		DOWN: "DOWN",
		LEFT: "LEFT",
		RIGHT: "RIGHT",
		REPEAT: "REPEAT",
		TIMES: "TIMES",
		WHILE: "WHILE",
		DO: "DO",
		IF: "IF",
		THEN: "THEN",
		ELSE: "ELSE",
		PROC: "PROCEDURE",
		AT_EDGE: "AT_EDGE",
		NOT_AT_EDGE: "NOT_AT_EDGE",
	},
	aliases: {},
};

/** Russian: proposal (spec-ant §2.4). */
const ru: KeywordSet = {
	language: "ru",
	keywords: {
		BEGIN: "НАЧАЛО",
		END: "КОНЕЦ",
		UP: "ВВЕРХ",
		DOWN: "ВНИЗ",
		LEFT: "ВЛЕВО",
		RIGHT: "ВПРАВО",
		REPEAT: "ПОВТОРИ",
		TIMES: "РАЗ",
		WHILE: "ПОКА",
		DO: "ДЕЛАЙ",
		IF: "ЕСЛИ",
		THEN: "ТО",
		ELSE: "ИНАЧЕ",
		PROC: "ПРОЦЕДУРА",
		AT_EDGE: "У_КРАЯ",
		NOT_AT_EDGE: "НЕ_У_КРАЯ",
	},
	aliases: {},
};

export const KEYWORD_SETS: Readonly<Record<Language, KeywordSet>> = {
	ro,
	en,
	ru,
};

/** Every spelling of `role` in `set`: the main one first, then the aliases. */
export function spellings(set: KeywordSet, role: Role): readonly string[] {
	return [set.keywords[role], ...(set.aliases[role] ?? [])];
}
