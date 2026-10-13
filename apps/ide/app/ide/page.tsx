import { Suspense } from "react";
import { IdeLoader } from "./IdeLoader";

export default function IdePage() {
	return (
		<Suspense>
			<IdeLoader />
		</Suspense>
	);
}
