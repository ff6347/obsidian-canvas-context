import { beforeAll, vi } from "vitest";

// Mock Obsidian API
beforeAll(() => {
	// Mock global Obsidian objects that might be used in tests
	global.app = {
		vault: {
			read: vi.fn(),
			modify: vi.fn(),
			create: vi.fn(),
		},
		workspace: {
			getActiveFile: vi.fn(),
		},
	} as any;

	// Mock other Obsidian globals as needed
	(global as any).Plugin = class MockPlugin {};
	(global as any).Setting = class MockSetting {};
	(global as any).Modal = class MockModal {};
	(global as any).Notice = class MockNotice {};
});