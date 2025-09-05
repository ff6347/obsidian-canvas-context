import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
	test: {
		globals: true,
		environment: "jsdom",
		include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
		exclude: ["node_modules", "dist", "build"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: ["node_modules/", "src/types/", "**/*.test.ts", "**/*.d.ts"],
		},
		setupFiles: ["./tests/setup.ts"],
	},
	resolve: {
		alias: {
			"@": resolve(__dirname, "./src"),
			"obsidian": resolve(__dirname, "./tests/mocks/obsidian.ts"),
		},
	},
});