/*  oxlint-disable eslint/max-lines-per-function */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CanvasService } from "../../src/services/canvas-service.ts";
import { createMockApp } from "../mocks/obsidian-extended.ts";
import { createMockCanvasData } from "../mocks/factories.ts";

// Mock Obsidian classes
vi.mock("obsidian", () => ({
	Notice: vi.fn(),
	TextFileView: vi.fn(),
	WorkspaceLeaf: vi.fn(),
}));

describe("CanvasService - Context", () => {
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

	describe("captureInferenceContext", () => {
		it("should capture inference context successfully", () => {
			const mockCanvasData = createMockCanvasData();
			const mockCanvas = {
				getData: vi.fn().mockReturnValue(mockCanvasData),
			};
			const mockGenerateId = vi.fn().mockReturnValue("test-context-id");

			const sourceNode = mockCanvasData.nodes[0];
			const result = service.captureInferenceContext(
				"Test Canvas.canvas",
				sourceNode!.id,
				mockCanvas as any,
				mockGenerateId,
			);

			expect(result).toEqual({
				id: "test-context-id",
				canvasFileName: "Test Canvas.canvas",
				sourceNodeId: sourceNode!.id,
				sourceNodePosition: {
					x: sourceNode!.x,
					y: sourceNode!.y,
					width: sourceNode!.width,
					height: sourceNode!.height,
				},
				timestamp: expect.any(Number),
			});
			expect(mockGenerateId).toHaveBeenCalled();
		});

		it("should throw error when no canvas data available", () => {
			const mockCanvas = {
				getData: vi.fn().mockReturnValue(null),
			};
			const mockGenerateId = vi.fn();

			expect(() =>
				service.captureInferenceContext(
					"Test Canvas.canvas",
					"test-node",
					mockCanvas as any,
					mockGenerateId,
				),
			).toThrow("No canvas data available for Test Canvas.canvas");
		});

		it("should throw error when source node not found", () => {
			const mockCanvasData = createMockCanvasData();
			const mockCanvas = {
				getData: vi.fn().mockReturnValue(mockCanvasData),
			};
			const mockGenerateId = vi.fn();

			expect(() =>
				service.captureInferenceContext(
					"Test Canvas.canvas",
					"non-existent-node",
					mockCanvas as any,
					mockGenerateId,
				),
			).toThrow(
				"Source node non-existent-node not found in canvas Test Canvas.canvas",
			);
		});

		it("should include current timestamp in context", () => {
			const mockCanvasData = createMockCanvasData();
			const mockCanvas = {
				getData: vi.fn().mockReturnValue(mockCanvasData),
			};
			const mockGenerateId = vi.fn().mockReturnValue("test-id");

			const beforeTime = Date.now();
			const result = service.captureInferenceContext(
				"Test Canvas.canvas",
				mockCanvasData.nodes[0]!.id,
				mockCanvas as any,
				mockGenerateId,
			);
			const afterTime = Date.now();

			expect(result.timestamp).toBeGreaterThanOrEqual(beforeTime);
			expect(result.timestamp).toBeLessThanOrEqual(afterTime);
		});
	});
});
