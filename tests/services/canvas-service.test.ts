import { describe, it, expect, vi, beforeEach } from "vitest";
import { CanvasService } from "../../src/services/canvas-service.ts";
import { createMockApp } from "../mocks/obsidian-extended.ts";

// Mock Obsidian classes
vi.mock("obsidian", () => ({
	Notice: vi.fn(),
	TextFileView: vi.fn(),
	WorkspaceLeaf: vi.fn(),
}));

describe("CanvasService", () => {
	let service: CanvasService;
	let mockApp: ReturnType<typeof createMockApp>;
	const mockNotificationAdapter = {
		showError: vi.fn(),
		show: vi.fn(),
		showInfo: vi.fn(),
		showSuccess: vi.fn(),
		showLoading: vi.fn(),
		hideLoading: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockApp = createMockApp();
		service = new CanvasService(mockApp as any, mockNotificationAdapter);
	});

	it("should initialize with app reference", () => {
		expect(service).toBeInstanceOf(CanvasService);
		expect((service as any).app).toBe(mockApp);
	});
});
