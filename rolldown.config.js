import { defineConfig } from "rolldown";
import builtins from "builtin-modules";
import { parseArgs } from "node:util";

const args = parseArgs({
	options: {
		production: { type: "boolean", short: "p" },
	},
});

const prod = args.values.production;

export default defineConfig({
	input: "src/main.ts",
	output: {
		file: "main.js",
		format: "cjs",
		sourcemap: prod ? false : "inline",
	},
	external: [
		"obsidian",
		"electron",
		"@codemirror/autocomplete",
		"@codemirror/collab",
		"@codemirror/commands",
		"@codemirror/language",
		"@codemirror/lint",
		"@codemirror/search",
		"@codemirror/state",
		"@codemirror/view",
		"@lezer/common",
		"@lezer/highlight",
		"@lezer/lr",
		...builtins,
	],
	logLevel: "info",
	minify: false,
});
