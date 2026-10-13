import { LANGUAGES, type Language } from "@repo/ant-grammar";

// Per-browser conveniences. Storage can be missing or throw (private mode), so
// every access falls back to the default.

const SPEED = "furnica.speed";
const LANGUAGE = "furnica.language";
export const DEFAULT_SPEED = 10;

function read(key: string): string | null {
	try {
		return localStorage.getItem(key);
	} catch {
		return null;
	}
}

function write(key: string, value: string): void {
	try {
		localStorage.setItem(key, value);
	} catch {
		// Not saved; the default applies next time.
	}
}

export function readSpeed(): number {
	const raw = read(SPEED);
	const speed = Number(raw);
	return raw !== null && Number.isInteger(speed) && speed >= 0 && speed <= 20
		? speed
		: DEFAULT_SPEED;
}

export const writeSpeed = (speed: number) => write(SPEED, String(speed));

export function readLanguage(): Language {
	const value = read(LANGUAGE);
	return LANGUAGES.find((l) => l === value) ?? "ro";
}

export const writeLanguage = (language: Language) => write(LANGUAGE, language);
