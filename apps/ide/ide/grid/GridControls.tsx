import type { Direction } from "@repo/ant-grammar";
import {
	ArrowDown,
	ArrowLeft,
	ArrowRight,
	ArrowUp,
	RefreshCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import type { Messages } from "@/i18n/messages";

export function GridControls({
	t,
	disabled,
	char,
	onCharChange,
	deleteMode,
	onDeleteModeChange,
	onMove,
	onRotate,
}: {
	t: Messages;
	disabled: boolean;
	char: string;
	onCharChange: (char: string) => void;
	deleteMode: boolean;
	onDeleteModeChange: (on: boolean) => void;
	onMove: (direction: Direction) => void;
	onRotate: () => void;
}) {
	const arrow = (direction: Direction, Icon: typeof ArrowUp) => (
		<Button
			variant="outline"
			size="icon"
			aria-label={t.arrows[direction]}
			title={t.arrows[direction]}
			disabled={disabled}
			onClick={() => onMove(direction)}
		>
			<Icon />
		</Button>
	);
	return (
		<div className="flex flex-wrap items-center gap-4">
			<label className="flex items-center gap-2 text-sm">
				{t.character}
				<Input
					className="w-12 text-center font-mono"
					value={char}
					disabled={disabled || deleteMode}
					onChange={(e) => onCharChange(e.target.value)}
				/>
			</label>
			<Toggle
				variant="outline"
				pressed={deleteMode}
				disabled={disabled}
				onPressedChange={onDeleteModeChange}
			>
				{t.deleteMode}
			</Toggle>
			<div className="grid grid-cols-3 gap-1">
				<span />
				{arrow("up", ArrowUp)}
				<span />
				{arrow("left", ArrowLeft)}
				<Button
					variant="outline"
					size="icon"
					aria-label={t.rotate}
					title={t.rotate}
					disabled={disabled}
					onClick={onRotate}
				>
					<RefreshCcw />
				</Button>
				{arrow("right", ArrowRight)}
				<span />
				{arrow("down", ArrowDown)}
				<span />
			</div>
		</div>
	);
}
