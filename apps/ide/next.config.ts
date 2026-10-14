import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve, sep } from "node:path";
import type { NextConfig } from "next";

// The global pnpm virtual store lives outside the repository, so Turbopack's
// root must cover both this app and the real location of the `next` package.
function commonAncestor(a: string, b: string): string {
	const left = a.split(sep);
	const right = b.split(sep);
	const shared: string[] = [];
	for (let i = 0; i < Math.min(left.length, right.length); i++) {
		if (left[i] !== right[i]) break;
		shared.push(left[i]);
	}
	return shared.join(sep) || sep;
}

const nextPackage = realpathSync(
	createRequire(import.meta.url).resolve("next/package.json"),
);
const turbopackRoot = commonAncestor(
	resolve(import.meta.dirname),
	dirname(nextPackage),
);

const nextConfig: NextConfig = {
	// The workspace packages export TypeScript source.
	transpilePackages: [
		"@repo/ant-grammar",
		"@repo/ant-runtime",
		"@repo/ant-file",
		"@repo/ant-tasks",
	],
	cacheComponents: true,
	partialPrefetching: true,
	turbopack: {
		root: turbopackRoot,
		rules: {
			"*.css": {
				loaders: ["@tailwindcss/turbopack"],
				as: "*.css",
			},
		},
	},
};

export default nextConfig;
