import type { Direction } from "@repo/ant-grammar";
import { GRID_SIZE, type GridObject, type Point } from "@repo/ant-runtime";
import { cn } from "@/lib/utils";

const RANGE = Array.from({ length: GRID_SIZE }, (_, i) => i + 1);
const key = (p: Point) => `${p.x},${p.y}`;

export function Grid({
	label,
	objects,
	ant,
	missing = [],
	misplaced = [],
	onCellClick,
	size = "md",
}: {
	label: string;
	objects: readonly GridObject[];
	ant?: { point: Point; facing: Direction };
	missing?: readonly GridObject[];
	misplaced?: readonly GridObject[];
	onCellClick?: (p: Point) => void;
	size?: "md" | "sm";
}) {
	const chars = new Map(objects.map((o) => [key(o), o.char]));
	const missingChars = new Map(missing.map((o) => [key(o), o.char]));
	const misplacedCells = new Set(misplaced.map(key));
	const cell =
		size === "md" ? "size-8 text-lg sm:size-10" : "size-4 text-[10px]";

	return (
		<div
			role="group"
			aria-label={label}
			className="inline-grid gap-px"
			style={{ gridTemplateColumns: `auto repeat(${GRID_SIZE}, auto)` }}
		>
			<span />
			{size === "md" &&
				RANGE.map((x) => (
					<span
						key={x}
						className="text-center text-xs text-muted-foreground"
					>
						{x}
					</span>
				))}
			{size === "sm" && RANGE.map((x) => <span key={x} />)}
			{RANGE.map((y) => [
				<span
					key={`row-${y}`}
					className="pr-1 text-right text-xs text-muted-foreground"
				>
					{size === "md" ? y : ""}
				</span>,
				...RANGE.map((x) => {
					const p = { x, y };
					const isAnt =
						ant !== undefined &&
						ant.point.x === x &&
						ant.point.y === y;
					const state = misplacedCells.has(key(p))
						? "misplaced"
						: missingChars.has(key(p)) && !chars.has(key(p))
							? "missing"
							: undefined;
					const content = isAnt ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={`/sprites/${ant.facing}.png`}
							alt={ant.facing}
							className="size-full [image-rendering:pixelated]"
						/>
					) : (
						(chars.get(key(p)) ?? missingChars.get(key(p)))
					);
					const className = cn(
						"flex items-center justify-center rounded-sm border bg-card font-mono leading-none",
						cell,
						state === "missing" &&
							"border-dashed border-amber-500 text-muted-foreground/60",
						state === "misplaced" &&
							"border-destructive bg-destructive/10",
						onCellClick &&
							!isAnt &&
							"cursor-pointer hover:bg-accent",
					);
					return onCellClick ? (
						<button
							key={key(p)}
							type="button"
							aria-label={key(p)}
							data-state={state}
							className={className}
							disabled={isAnt}
							onClick={() => !isAnt && onCellClick(p)}
						>
							{content}
						</button>
					) : (
						<div
							key={key(p)}
							aria-label={key(p)}
							data-state={state}
							className={className}
						>
							{content}
						</div>
					);
				}),
			])}
		</div>
	);
}
