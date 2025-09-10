import { rolldown, watch } from "rolldown";
import builtins from "builtin-modules";
import { parseArgs } from "node:util";

const args = parseArgs({
	options: {
		production: { type: "boolean", short: "p" },
		watch: { type: "boolean", short: "w" },
	},
});

const prod = args.values.production;
const watchMode = args.values.watch;

const config = {
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
};

if (watchMode) {
	console.log("Starting rolldown in watch mode...");
	const watcher = watch(config);

	watcher.on("event", (event) => {
		if (event.code === "BUNDLE_START") {
			console.log("Building...");
		} else if (event.code === "BUNDLE_END") {
			console.log("Build completed");
		} else if (event.code === "ERROR") {
			console.error("Build error:", event.error);
		}
	});

	process.on("SIGINT", async () => {
		console.log("Closing watcher...");
		await watcher.close();
		process.exit(0);
	});
} else {
	console.log(`Building for ${prod ? "production" : "development"}...`);

	try {
		const bundle = await rolldown(config);
		await bundle.write(config.output);
		console.log("Build completed successfully!");
		process.exit(0);
	} catch (error) {
		console.error("Build failed:", error);
		process.exit(1);
	}
}
