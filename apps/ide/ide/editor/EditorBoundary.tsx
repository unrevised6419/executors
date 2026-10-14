"use client";

import { Component, Fragment, type ReactNode } from "react";

/** Shows `fallback` when the editor throws, and remounts it on retry. */
export class EditorBoundary extends Component<
	{ fallback: (retry: () => void) => ReactNode; children: ReactNode },
	{ failed: boolean; attempt: number }
> {
	override state = { failed: false, attempt: 0 };

	static getDerivedStateFromError() {
		return { failed: true };
	}

	override render() {
		if (this.state.failed)
			return this.props.fallback(() =>
				this.setState((s) => ({
					failed: false,
					attempt: s.attempt + 1,
				})),
			);
		return (
			<Fragment key={this.state.attempt}>{this.props.children}</Fragment>
		);
	}
}
