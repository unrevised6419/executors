"use client";

import { useRef, useState } from "react";
import { FileText } from "lucide-react";
import {
	AntFileError,
	writeAntFile,
	type AntFileEncoding,
} from "@repo/ant-file";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { useDialogs } from "@/components/dialogs";
import type { Messages } from "@/i18n/messages";
import type { Exercise } from "@/storage/exercise";
import {
	defaultEncoding,
	downloadBytes,
	openProgramFile,
	saveFileName,
	type OpenedFile,
} from "./files";

const ENCODINGS: readonly AntFileEncoding[] = [
	"windows-1250",
	"windows-1251",
	"utf-8",
];

export function FileMenu({
	t,
	disabled,
	exercise,
	dialogs,
	onOpened,
}: {
	t: Messages;
	disabled: boolean;
	exercise: Exercise;
	dialogs: ReturnType<typeof useDialogs>;
	onOpened: (file: OpenedFile) => void;
}) {
	const input = useRef<HTMLInputElement>(null);
	const [choice, setChoice] = useState<AntFileEncoding | "auto">("auto");
	const encoding =
		choice === "auto" ? defaultEncoding(exercise.language) : choice;

	async function open(file: File) {
		if (
			exercise.source.trim() !== "" &&
			!(await dialogs.confirm(t.confirmOpen))
		)
			return;
		try {
			onOpened(
				openProgramFile(
					file.name,
					new Uint8Array(await file.arrayBuffer()),
					encoding,
				),
			);
		} catch (error) {
			if (!(error instanceof AntFileError)) throw error;
			await dialogs.alert(t.openFailed, error.message);
		}
	}

	async function save() {
		const name = saveFileName(exercise, t);
		const file = { world: exercise.start, source: exercise.source };
		try {
			downloadBytes(writeAntFile(file, { encoding }), name);
		} catch (error) {
			if (!(error instanceof RangeError)) throw error;
			if (
				await dialogs.confirm(t.cannotEncode, error.message, t.saveUtf8)
			)
				downloadBytes(writeAntFile(file, { encoding: "utf-8" }), name);
		}
	}

	return (
		<>
			<input
				ref={input}
				type="file"
				accept=".ant,.antp,.txt"
				className="hidden"
				data-testid="open-file"
				onChange={(e) => {
					const file = e.target.files?.[0];
					e.target.value = "";
					if (file) void open(file);
				}}
			/>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="sm" disabled={disabled}>
						<FileText />
						{t.file}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start">
					<DropdownMenuItem onSelect={() => input.current?.click()}>
						{t.open}
					</DropdownMenuItem>
					<DropdownMenuItem onSelect={() => void save()}>
						{t.save}
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuLabel>{t.encoding}</DropdownMenuLabel>
					<DropdownMenuRadioGroup
						value={choice}
						onValueChange={(v) =>
							setChoice(v as AntFileEncoding | "auto")
						}
					>
						<DropdownMenuRadioItem value="auto">
							{t.automatic} ({defaultEncoding(exercise.language)})
						</DropdownMenuRadioItem>
						{ENCODINGS.map((e) => (
							<DropdownMenuRadioItem key={e} value={e}>
								{e}
							</DropdownMenuRadioItem>
						))}
					</DropdownMenuRadioGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
}
