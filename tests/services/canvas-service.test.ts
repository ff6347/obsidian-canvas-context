import { describe, it, expect, vi, beforeEach } from "vitest";
import { CanvasService } from "../../src/services/canvas-service.ts";
import { createMockApp } from "../mocks/obsidian-extended.ts";
import { TestNotificationAdapter } from "../adapters/test-notification-adapter.ts";

// Mock Obsidian classes
vi.mock("obsidian", () => ({
	Notice: vi.fn(),
	TextFileView: vi.fn(),
	WorkspaceLeaf: vi.fn(),
}));

describe("CanvasService", () => {
	let service: CanvasService;
	let mockApp: ReturnType<typeof createMockApp>;
	let testNotificationAdapter: TestNotificationAdapter;

	beforeEach(() => {
		vi.clearAllMocks();
		mockApp = createMockApp();
		testNotificationAdapter = new TestNotificationAdapter();
		service = new CanvasService(mockApp as any, testNotificationAdapter);
	});

	it("should initialize with app reference", () => {
		expect(service).toBeInstanceOf(CanvasService);
		expect((service as any).app).toBe(mockApp);
	});
});
