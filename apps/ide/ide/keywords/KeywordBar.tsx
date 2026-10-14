import type { KeywordSet } from "@repo/ant-grammar";
import { Button } from "@/components/ui/button";
import { buttonLabel, KEYWORD_BUTTONS, type KeywordButton } from "./insert";

export function KeywordBar({
	set,
	disabled,
	onInsert,
}: {
	set: KeywordSet;
	disabled: boolean;
	onInsert: (button: KeywordButton) => void;
}) {
	return (
		<div className="flex flex-wrap gap-1">
			{KEYWORD_BUTTONS.map((button) => (
				<Button
					key={button}
					variant="outline"
					size="sm"
					className="h-7 px-2 font-mono text-xs"
					disabled={disabled}
					onClick={() => onInsert(button)}
				>
					{buttonLabel(button, set)}
				</Button>
			))}
		</div>
	);
}
