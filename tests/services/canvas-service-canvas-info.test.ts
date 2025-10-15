/* oxlint-disable eslint/max-lines-per-function */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CanvasService } from "../../src/services/canvas-service.ts";
import { createMockApp } from "../mocks/obsidian-extended.ts";
import { createMockCanvasData } from "../mocks/factories.ts";
import type { ExtendedCanvasConnection } from "../../src/types/canvas-types.ts";

// Mock Obsidian classes
vi.mock("obsidian", () => ({
	Notice: vi.fn(),
	TextFileView: vi.fn(),
	WorkspaceLeaf: vi.fn(),
}));

describe("CanvasService - Canvas Info", () => {
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

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("getCanvasInfo", () => {
		it("should return canvas info when node has canvas reference", () => {
			const mockCanvas = {
				getData: vi.fn().mockReturnValue(createMockCanvasData()),
			};
			const mockView = {
				canvas: mockCanvas,
				file: { name: "Test Canvas.canvas" },
			};
			const mockLeaf = { view: mockView };

			mockApp.workspace.getLeavesOfType.mockReturnValue([mockLeaf]);

			const node: ExtendedCanvasConnection = {
				canvas: mockCanvas,
				id: "test-node",
			} as any;

			const result = service.getCanvasInfo(node);

			expect(result).toEqual({
				canvas: mockCanvas,
				name: "Test Canvas.canvas",
			});
			expect(mockApp.workspace.getLeavesOfType).toHaveBeenCalledWith("canvas");
		});

		it("should return null when canvas found but no associated file", () => {
			const mockCanvas = {
				getData: vi.fn().mockReturnValue(createMockCanvasData()),
			};

			const node: ExtendedCanvasConnection = {
				canvas: mockCanvas,
				id: "test-node",
			} as any;

			mockApp.workspace.getLeavesOfType.mockReturnValue([]);

			const result = service.getCanvasInfo(node);

			expect(result).toBeNull();
		});

		it("should return active canvas when no node provided", () => {
			const mockCanvas = {
				getData: vi.fn().mockReturnValue(createMockCanvasData()),
			};
			const mockView = {
				canvas: mockCanvas,
				file: { name: "Active Canvas.canvas", extension: "canvas" },
			};

			mockApp.workspace.getActiveViewOfType.mockReturnValue(mockView);

			const result = service.getCanvasInfo();

			expect(result).toEqual({
				canvas: mockCanvas,
				name: "Active Canvas.canvas",
			});
		});

		it("should return null when no valid canvas found", () => {
			mockApp.workspace.getActiveViewOfType.mockReturnValue(null);

			const result = service.getCanvasInfo();

			expect(result).toBeNull();
		});

		it("should return null when active view is not a canvas", () => {
			const mockView = {
				file: { extension: "md" }, // Not a canvas
			};

			mockApp.workspace.getActiveViewOfType.mockReturnValue(mockView);

			const result = service.getCanvasInfo();

			expect(result).toBeNull();
		});

		it("should handle active canvas view without canvas property", () => {
			const mockView = {
				file: { name: "Test.canvas", extension: "canvas" },
				canvas: null, // No canvas object
			};

			mockApp.workspace.getActiveViewOfType.mockReturnValue(mockView);

			const result = service.getCanvasInfo();

			expect(result).toBeNull();
		});
	});
});
