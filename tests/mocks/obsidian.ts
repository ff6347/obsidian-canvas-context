import { vi } from "vitest";

// Mock Obsidian classes and interfaces
export class TFile {
	path: string;
	name: string;
	basename: string;
	extension: string;

	constructor(path: string) {
		this.path = path;
		this.name = path.split("/").pop() || "";
		this.basename = this.name.split(".")[0] || "";
		this.extension = this.name.split(".").pop() || "";
	}

	// Make instanceof work in tests
	static [Symbol.hasInstance](instance: any) {
		return instance && instance.path && instance.name;
	}
}

export class App {
	vault = {
		getAbstractFileByPath: vi.fn(),
		cachedRead: vi.fn(),
		read: vi.fn(),
		modify: vi.fn(),
		create: vi.fn(),
	};

	metadataCache = {
		getFileCache: vi.fn(),
		getCache: vi.fn(),
	};

	workspace = {
		getActiveFile: vi.fn(),
	};
}

export class Plugin {
	app: App;

	constructor(app: App) {
		this.app = app;
	}
}

// Mock frontmatter utilities
export function getFrontMatterInfo(content: string) {
	const match = content.match(/^---\n([\s\S]*?)\n---\n/);
	if (match) {
		return {
			exists: true,
			frontmatter: match[1],
			from: 0,
			to: match[0].length,
			contentStart: match[0].length,
		};
	}
	return {
		exists: false,
		frontmatter: "",
		from: 0,
		to: 0,
		contentStart: 0,
	};
}

// Mock other common exports
export class Modal {}
export class Setting {}
export class Notice {}
