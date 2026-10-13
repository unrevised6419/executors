import type { Direction, Language } from "@repo/ant-grammar";
import type { Mode } from "@/ide/mode";

export interface Messages {
	appName: string;
	home: string;
	tasks: string;
	task: (n: number) => string;
	freeProgram: string;
	newProgram: string;
	myPrograms: string;
	noPrograms: string;
	solved: string;
	remove: string;
	newFile: string;
	open: string;
	save: string;
	file: string;
	encoding: string;
	automatic: string;
	check: string;
	run: string;
	step: string;
	stop: string;
	reset: string;
	speed: string;
	language: string;
	theme: string;
	character: string;
	deleteMode: string;
	rotate: string;
	arrows: Record<Direction, string>;
	modes: Record<Mode, string>;
	syntaxOk: string;
	syntaxErrors: (n: number) => string;
	steps: (n: number) => string;
	goal: string;
	goalSolved: string;
	goalProgress: (missing: number, misplaced: number) => string;
	restoreStart: string;
	notSaved: string;
	confirmNew: string;
	confirmLanguage: string;
	confirmOpen: string;
	confirmRemove: string;
	ok: string;
	cancel: string;
	saveUtf8: string;
	cannotEncode: string;
	openFailed: string;
	invalidCharacter: string;
	editorFailed: string;
	retry: string;
	notFound: string;
	loading: string;
	loadFailed: string;
	program: string;
	grid: string;
}

const ro: Messages = {
	appName: "Furnica",
	home: "Acasă",
	tasks: "Sarcini",
	task: (n) => `Sarcina ${n}`,
	freeProgram: "Program liber",
	newProgram: "Program nou",
	myPrograms: "Programele mele",
	noPrograms: "Încă nu ai programe.",
	solved: "Rezolvat",
	remove: "Șterge",
	newFile: "Nou",
	open: "Deschide…",
	save: "Salvează",
	file: "Fișier",
	encoding: "Codificare",
	automatic: "Automat",
	check: "Verifică sintaxa",
	run: "Execută",
	step: "Un pas",
	stop: "Oprește",
	reset: "Resetează",
	speed: "Viteza",
	language: "Limba",
	theme: "Tema",
	character: "Caracterul",
	deleteMode: "Ștergere",
	rotate: "Rotire",
	arrows: { up: "Sus", down: "Jos", left: "Stânga", right: "Dreapta" },
	modes: {
		setup: "Pregătire",
		running: "Rulează",
		paused: "Pauză",
		done: "Terminat",
	},
	syntaxOk: "Sintaxa este corectă.",
	syntaxErrors: (n) => `Erori de sintaxă: ${n}`,
	steps: (n) => `Pași: ${n}`,
	goal: "Scopul",
	goalSolved: "Rezolvat!",
	goalProgress: (m, p) => `Lipsesc: ${m} · Greșit plasate: ${p}`,
	restoreStart: "Pornește din nou de la început",
	notSaved:
		"Stocarea browserului nu este disponibilă: lucrul nu se salvează.",
	confirmNew: "Începi un program nou?",
	confirmLanguage:
		"Cuvintele cheie ale programului nu vor mai fi recunoscute. Schimbi limba?",
	confirmOpen: "Programul și terenul curent vor fi înlocuite. Continui?",
	confirmRemove: "Ștergi acest program?",
	ok: "OK",
	cancel: "Anulare",
	saveUtf8: "Salvează în UTF-8",
	cannotEncode: "Fișierul nu poate fi salvat în această codificare",
	openFailed: "Fișierul nu poate fi deschis",
	invalidCharacter: "Alege un singur caracter, altul decât spațiu sau *.",
	editorFailed: "Editorul nu s-a încărcat.",
	retry: "Reîncearcă",
	notFound: "Programul nu a fost găsit.",
	loading: "Se încarcă…",
	loadFailed: "Programul nu a putut fi încărcat.",
	program: "Program",
	grid: "Teren",
};

const en: Messages = {
	appName: "Furnica",
	home: "Home",
	tasks: "Tasks",
	task: (n) => `Task ${n}`,
	freeProgram: "Free program",
	newProgram: "New program",
	myPrograms: "My programs",
	noPrograms: "No programs yet.",
	solved: "Solved",
	remove: "Delete",
	newFile: "New",
	open: "Open…",
	save: "Save",
	file: "File",
	encoding: "Encoding",
	automatic: "Automatic",
	check: "Check syntax",
	run: "Run",
	step: "Step",
	stop: "Stop",
	reset: "Reset",
	speed: "Speed",
	language: "Language",
	theme: "Theme",
	character: "Character",
	deleteMode: "Delete",
	rotate: "Rotate",
	arrows: { up: "Up", down: "Down", left: "Left", right: "Right" },
	modes: {
		setup: "Setup",
		running: "Running",
		paused: "Paused",
		done: "Done",
	},
	syntaxOk: "The syntax is correct.",
	syntaxErrors: (n) => `Syntax errors: ${n}`,
	steps: (n) => `Steps: ${n}`,
	goal: "Goal",
	goalSolved: "Solved!",
	goalProgress: (m, p) => `Missing: ${m} · Misplaced: ${p}`,
	restoreStart: "Restore the task's start",
	notSaved: "Browser storage is unavailable: your work is not being saved.",
	confirmNew: "Start a new program?",
	confirmLanguage:
		"The program's keywords will no longer be recognised. Change the language?",
	confirmOpen: "The current program and grid will be replaced. Continue?",
	confirmRemove: "Delete this program?",
	ok: "OK",
	cancel: "Cancel",
	saveUtf8: "Save as UTF-8",
	cannotEncode: "The file cannot be saved in this encoding",
	openFailed: "The file cannot be opened",
	invalidCharacter: "Choose one character other than a space or *.",
	editorFailed: "The editor did not load.",
	retry: "Retry",
	notFound: "The program was not found.",
	loading: "Loading…",
	loadFailed: "The program could not be loaded.",
	program: "Program",
	grid: "Grid",
};

const ru: Messages = {
	appName: "Муравей",
	home: "Главная",
	tasks: "Задания",
	task: (n) => `Задание ${n}`,
	freeProgram: "Свободная программа",
	newProgram: "Новая программа",
	myPrograms: "Мои программы",
	noPrograms: "Программ пока нет.",
	solved: "Решено",
	remove: "Удалить",
	newFile: "Новый",
	open: "Открыть…",
	save: "Сохранить",
	file: "Файл",
	encoding: "Кодировка",
	automatic: "Автоматически",
	check: "Проверить синтаксис",
	run: "Выполнить",
	step: "Шаг",
	stop: "Остановить",
	reset: "Сбросить",
	speed: "Скорость",
	language: "Язык",
	theme: "Тема",
	character: "Символ",
	deleteMode: "Удаление",
	rotate: "Повернуть",
	arrows: { up: "Вверх", down: "Вниз", left: "Влево", right: "Вправо" },
	modes: {
		setup: "Подготовка",
		running: "Выполняется",
		paused: "Пауза",
		done: "Завершено",
	},
	syntaxOk: "Синтаксис правильный.",
	syntaxErrors: (n) => `Синтаксических ошибок: ${n}`,
	steps: (n) => `Шагов: ${n}`,
	goal: "Цель",
	goalSolved: "Решено!",
	goalProgress: (m, p) => `Не хватает: ${m} · Не на месте: ${p}`,
	restoreStart: "Вернуть начальное поле",
	notSaved: "Хранилище браузера недоступно: работа не сохраняется.",
	confirmNew: "Начать новую программу?",
	confirmLanguage:
		"Ключевые слова программы перестанут распознаваться. Сменить язык?",
	confirmOpen: "Текущая программа и поле будут заменены. Продолжить?",
	confirmRemove: "Удалить эту программу?",
	ok: "OK",
	cancel: "Отмена",
	saveUtf8: "Сохранить в UTF-8",
	cannotEncode: "Файл нельзя сохранить в этой кодировке",
	openFailed: "Файл не удаётся открыть",
	invalidCharacter: "Выберите один символ, кроме пробела и *.",
	editorFailed: "Редактор не загрузился.",
	retry: "Повторить",
	notFound: "Программа не найдена.",
	loading: "Загрузка…",
	loadFailed: "Не удалось загрузить программу.",
	program: "Программа",
	grid: "Поле",
};

export const MESSAGES: Readonly<Record<Language, Messages>> = { ro, en, ru };
