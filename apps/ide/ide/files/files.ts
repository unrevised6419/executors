import type { Language } from "@repo/ant-grammar";
import { readAntFile, type AntFileEncoding } from "@repo/ant-file";
import type { World } from "@repo/ant-runtime";
import type { Messages } from "@/i18n/messages";
import type { Exercise } from "@/storage/exercise";

/** The original wrote the system code page: Russian systems used windows-1251. */
export function defaultEncoding(language: Language): AntFileEncoding {
	return language === "ru" ? "windows-1251" : "windows-1250";
}

export interface OpenedFile {
	readonly source: string;
	/** Absent for program-only files, which keep the current grid. */
	readonly start?: World;
}

/**
 * Reads a `.ant` file (world and program, in `encoding`) or any other file as
 * UTF-8 program text, such as the `.antp` solutions.
 *
 * @throws AntFileError when a `.ant` file is malformed.
 */
export function openProgramFile(
	name: string,
	bytes: Uint8Array,
	encoding: AntFileEncoding,
): OpenedFile {
	if (name.toLowerCase().endsWith(".ant")) {
		const { world, source } = readAntFile(bytes, { encoding });
		return { source, start: world };
	}
	return {
		source: new TextDecoder("utf-8").decode(bytes).replace(/\r\n?/g, "\n"),
	};
}

function slug(text: string): string {
	return text
		.normalize("NFKD")
		.replace(/\p{M}/gu, "")
		.toLowerCase()
		.replace(/[^a-z0-9а-яё]+/gu, "-")
		.replace(/^-|-$/g, "");
}

export function saveFileName(exercise: Exercise, t: Messages): string {
	const base =
		exercise.taskNumber !== undefined
			? t.task(exercise.taskNumber)
			: exercise.title || t.newProgram;
	return `${slug(base) || "program"}.ant`;
}

export function downloadBytes(bytes: Uint8Array, name: string): void {
	const url = URL.createObjectURL(
		new Blob([bytes as BlobPart], { type: "application/octet-stream" }),
	);
	const a = document.createElement("a");
	a.href = url;
	a.download = name;
	a.click();
	setTimeout(() => URL.revokeObjectURL(url), 0);
}
