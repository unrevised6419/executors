import { useEffect, useState, type Dispatch } from "react";
import type { IdeAction } from "@/ide/state";
import { RunController } from "./run-controller";

/** One controller per IDE, stopped when the IDE unmounts. */
export function useRunController(dispatch: Dispatch<IdeAction>): RunController {
	const [controller] = useState(
		() =>
			new RunController((report) =>
				dispatch({ type: "step", ...report }),
			),
	);
	useEffect(() => () => controller.stop(), [controller]);
	return controller;
}
