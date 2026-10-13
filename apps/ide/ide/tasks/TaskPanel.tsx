import type { GoalCheck, Task } from "@repo/ant-tasks";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Messages } from "@/i18n/messages";
import { Grid } from "@/ide/grid/Grid";

export function TaskPanel({
	t,
	task,
	check,
}: {
	t: Messages;
	task: Task;
	check: GoalCheck | undefined;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{t.task(task.number)}</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				<Grid label={t.goal} objects={task.goal} size="sm" />
				{check?.solved && (
					<p className="flex items-center gap-2 font-medium text-green-600">
						<CheckCircle2 className="size-4" />
						{t.goalSolved}
					</p>
				)}
				{check && !check.solved && (
					<p className="text-sm text-muted-foreground">
						{t.goalProgress(
							check.missing.length,
							check.misplaced.length,
						)}
					</p>
				)}
			</CardContent>
		</Card>
	);
}
