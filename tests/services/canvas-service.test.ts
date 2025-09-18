import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CanvasService } from "../../src/services/canvas-service.ts";
import { createMockApp } from "../mocks/obsidian-extended.ts";
import {
	createMockCanvasData,
	createMockCanvasNode,
	createMockCanvasTextNode,
	createMockInferenceContext,
} from "../mocks/factories.ts";
import type {
	CanvasData,
	ExtendedCanvasConnection,
	InferenceContext,
} from "../../src/types/canvas-types.ts";

// Mock Obsidian classes
vi.mock("obsidian", () => ({
	Notice: vi.fn(),
	TextFileView: vi.fn(),
	WorkspaceLeaf: vi.fn(),
}));

describe("CanvasService", () => {
	let service: CanvasService;
	let mockApp: ReturnType<typeof createMockApp>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockApp = createMockApp();
		service = new CanvasService(mockApp as any);
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

		it("should return fallback name when canvas found but no file name", () => {
			const mockCanvas = {
				getData: vi.fn().mockReturnValue(createMockCanvasData()),
			};

			const node: ExtendedCanvasConnection = {
				canvas: mockCanvas,
				id: "test-node",
			} as any;

			mockApp.workspace.getLeavesOfType.mockReturnValue([]);

			const result = service.getCanvasInfo(node);

			expect(result).toEqual({
				canvas: mockCanvas,
				name: "canvas",
			});
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
				sourceNode.id,
				mockCanvas as any,
				mockGenerateId,
			);

			expect(result).toEqual({
				id: "test-context-id",
				canvasFileName: "Test Canvas.canvas",
				sourceNodeId: sourceNode.id,
				sourceNodePosition: {
					x: sourceNode.x,
					y: sourceNode.y,
					width: sourceNode.width,
					height: sourceNode.height,
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
				mockCanvasData.nodes[0].id,
				mockCanvas as any,
				mockGenerateId,
			);
			const afterTime = Date.now();

			expect(result.timestamp).toBeGreaterThanOrEqual(beforeTime);
			expect(result.timestamp).toBeLessThanOrEqual(afterTime);
		});
	});

	describe("createResponseNode", () => {
		let mockCanvas: any;
		let mockCanvasData: CanvasData;
		let mockSourceNode: ExtendedCanvasConnection;
		let mockGenerateId: ReturnType<typeof vi.fn>;

		beforeEach(() => {
			mockCanvasData = createMockCanvasData();
			mockCanvas = {
				getData: vi.fn().mockReturnValue(mockCanvasData),
				importData: vi.fn(),
				requestFrame: vi.fn(),
			};
			mockSourceNode = {
				canvas: mockCanvas,
				id: mockCanvasData.nodes[0].id,
			} as any;
			mockGenerateId = vi.fn()
				.mockReturnValueOnce("response-node-id")
				.mockReturnValueOnce("edge-id");
		});

		it("should create assistant response node with proper formatting", () => {
			const response = "This is the LLM response";

			service.createResponseNode(mockSourceNode, response, false, mockGenerateId);

			expect(mockCanvas.importData).toHaveBeenCalledWith(
				{
					edges: [
						...mockCanvasData.edges,
						{
							id: "edge-id",
							fromNode: mockSourceNode.id,
							toNode: "response-node-id",
							fromSide: "bottom",
							toSide: "top",
						},
					],
					nodes: [
						...mockCanvasData.nodes,
						{
							type: "text",
							text: "---\nrole: assistant\n\n---\n\nThis is the LLM response",
							id: "response-node-id",
							x: 0, // From mock source node
							y: 150, // source.y + source.height + 50
							width: 400,
							height: 200,
							color: "3",
						},
					],
				},
				undefined,
			);
			expect(mockCanvas.requestFrame).toHaveBeenCalledWith(undefined);
		});

		it("should create error response node with proper formatting", () => {
			const errorMessage = "Connection failed";

			service.createResponseNode(
				mockSourceNode,
				errorMessage,
				true,
				mockGenerateId,
			);

			expect(mockCanvas.importData).toHaveBeenCalledWith(
				expect.objectContaining({
					nodes: expect.arrayContaining([
						expect.objectContaining({
							text: "---\nrole: error\n\n---\n\nConnection failed",
							color: "1", // Error color
						}),
					]),
				}),
				undefined,
			);
		});

		it("should position response node below source node", () => {
			const sourceNodeData = mockCanvasData.nodes[0];
			const response = "Test response";

			service.createResponseNode(mockSourceNode, response, false, mockGenerateId);

			const importCall = mockCanvas.importData.mock.calls[0][0];
			const responseNode = importCall.nodes.find(
				(n: any) => n.id === "response-node-id",
			);

			expect(responseNode.x).toBe(sourceNodeData.x);
			expect(responseNode.y).toBe(
				sourceNodeData.y + sourceNodeData.height + 50,
			);
		});

		it("should handle missing source node data with defaults", () => {
			const mockCanvasDataWithoutSource = {
				nodes: [], // No matching source node
				edges: [],
			};
			mockCanvas.getData.mockReturnValue(mockCanvasDataWithoutSource);

			service.createResponseNode(mockSourceNode, "Test", false, mockGenerateId);

			const importCall = mockCanvas.importData.mock.calls[0][0];
			const responseNode = importCall.nodes[0];

			expect(responseNode.x).toBe(100); // Default x
			expect(responseNode.y).toBe(150); // Default y (50 + 50 + 50)
		});

		it("should not create node when canvas is missing", () => {
			const nodeWithoutCanvas = { id: "test-id" } as ExtendedCanvasConnection;

			service.createResponseNode(
				nodeWithoutCanvas,
				"Test",
				false,
				mockGenerateId,
			);

			expect(mockCanvas.importData).not.toHaveBeenCalled();
		});

		it("should not create node when node ID is missing", () => {
			const nodeWithoutId = { canvas: mockCanvas } as ExtendedCanvasConnection;

			service.createResponseNode(nodeWithoutId, "Test", false, mockGenerateId);

			expect(mockCanvas.importData).not.toHaveBeenCalled();
		});

		it("should not create node when canvas data is null", () => {
			mockCanvas.getData.mockReturnValue(null);

			service.createResponseNode(mockSourceNode, "Test", false, mockGenerateId);

			expect(mockCanvas.importData).not.toHaveBeenCalled();
		});
	});

	describe("createResponseNodeWithContext", () => {
		let mockContext: InferenceContext;
		let mockGenerateId: ReturnType<typeof vi.fn>;
		let mockCanvas: any;
		let mockCanvasView: any;
		let mockLeaf: any;

		beforeEach(() => {
			mockContext = createMockInferenceContext();
			mockGenerateId = vi.fn()
				.mockReturnValueOnce("response-node-id")
				.mockReturnValueOnce("edge-id");

			mockCanvas = {
				getData: vi.fn().mockReturnValue(createMockCanvasData()),
				importData: vi.fn(),
				requestFrame: vi.fn(),
			};

			mockCanvasView = {
				canvas: mockCanvas,
				file: { name: mockContext.canvasFileName },
			};

			mockLeaf = { view: mockCanvasView };
		});

		it("should create response node when canvas is already loaded", async () => {
			mockApp.workspace.getLeavesOfType.mockReturnValue([mockLeaf]);

			await service.createResponseNodeWithContext(
				mockContext,
				"Test response",
				false,
				mockGenerateId,
			);

			expect(mockCanvas.importData).toHaveBeenCalled();
			expect(mockCanvas.requestFrame).toHaveBeenCalled();
			expect(mockApp.vault.modify).toHaveBeenCalled();
		});

		it("should open canvas file when not currently loaded", async () => {
			const mockFile = { path: mockContext.canvasFileName };
			mockApp.vault.getAbstractFileByPath.mockReturnValue(mockFile);

			// First call: no leaves (canvas not loaded)
			// Second call: canvas loaded after opening
			mockApp.workspace.getLeavesOfType
				.mockReturnValueOnce([])
				.mockReturnValueOnce([mockLeaf]);

			await service.createResponseNodeWithContext(
				mockContext,
				"Test response",
				false,
				mockGenerateId,
			);

			expect(mockApp.workspace.openLinkText).toHaveBeenCalledWith(
				mockContext.canvasFileName,
				"",
				true,
			);
			expect(mockCanvas.importData).toHaveBeenCalled();
		});

		it("should show notice when canvas cannot be opened", async () => {
			const { Notice } = await import("obsidian");

			mockApp.workspace.getLeavesOfType.mockReturnValue([]);
			mockApp.vault.getAbstractFileByPath.mockReturnValue(null);

			await service.createResponseNodeWithContext(
				mockContext,
				"Test response",
				false,
				mockGenerateId,
			);

			expect(Notice).toHaveBeenCalledWith(
				`Canvas "${mockContext.canvasFileName}" could not be opened for response placement`,
			);
			expect(mockCanvas.importData).not.toHaveBeenCalled();
		});

		it("should use context position for response node placement", async () => {
			mockApp.workspace.getLeavesOfType.mockReturnValue([mockLeaf]);

			await service.createResponseNodeWithContext(
				mockContext,
				"Test response",
				false,
				mockGenerateId,
			);

			const importCall = mockCanvas.importData.mock.calls[0][0];
			const responseNode = importCall.nodes.find(
				(n: any) => n.id === "response-node-id",
			);

			expect(responseNode.x).toBe(mockContext.sourceNodePosition.x);
			expect(responseNode.y).toBe(
				mockContext.sourceNodePosition.y + mockContext.sourceNodePosition.height + 50,
			);
		});

		it("should create edge connecting source to response node", async () => {
			mockApp.workspace.getLeavesOfType.mockReturnValue([mockLeaf]);

			await service.createResponseNodeWithContext(
				mockContext,
				"Test response",
				false,
				mockGenerateId,
			);

			const importCall = mockCanvas.importData.mock.calls[0][0];
			const edge = importCall.edges.find((e: any) => e.id === "edge-id");

			expect(edge).toEqual({
				id: "edge-id",
				fromNode: mockContext.sourceNodeId,
				toNode: "response-node-id",
				fromSide: "bottom",
				toSide: "top",
			});
		});

		it("should handle canvas save failure gracefully", async () => {
			const { Notice } = await import("obsidian");

			mockApp.workspace.getLeavesOfType.mockReturnValue([mockLeaf]);
			mockApp.vault.modify.mockRejectedValue(new Error("Save failed"));

			await service.createResponseNodeWithContext(
				mockContext,
				"Test response",
				false,
				mockGenerateId,
			);

			expect(Notice).toHaveBeenCalledWith(
				"Response added but canvas save failed. Please save manually.",
			);
		});

		it("should not proceed when canvas view has no canvas", async () => {
			const leafWithoutCanvas = {
				view: { ...mockCanvasView, canvas: null },
			};
			mockApp.workspace.getLeavesOfType.mockReturnValue([leafWithoutCanvas]);

			await service.createResponseNodeWithContext(
				mockContext,
				"Test response",
				false,
				mockGenerateId,
			);

			expect(mockCanvas.importData).not.toHaveBeenCalled();
		});

		it("should not proceed when canvas has no data", async () => {
			mockCanvas.getData.mockReturnValue(null);
			mockApp.workspace.getLeavesOfType.mockReturnValue([mockLeaf]);

			await service.createResponseNodeWithContext(
				mockContext,
				"Test response",
				false,
				mockGenerateId,
			);

			expect(mockCanvas.importData).not.toHaveBeenCalled();
		});

		it("should handle file opening errors gracefully", async () => {
			const mockFile = { path: mockContext.canvasFileName };
			mockApp.vault.getAbstractFileByPath.mockReturnValue(mockFile);
			mockApp.workspace.openLinkText.mockRejectedValue(
				new Error("Failed to open"),
			);

			// No leaves found even after trying to open
			mockApp.workspace.getLeavesOfType.mockReturnValue([]);

			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			await service.createResponseNodeWithContext(
				mockContext,
				"Test response",
				false,
				mockGenerateId,
			);

			expect(consoleSpy).toHaveBeenCalledWith(
				"Failed to open canvas file:",
				expect.any(Error),
			);

			consoleSpy.mockRestore();
		});
	});

	describe("findCanvasLeaf (private method testing via public methods)", () => {
		it("should find canvas by exact file name match", async () => {
			const mockCanvas = {
				getData: vi.fn().mockReturnValue(createMockCanvasData()),
				importData: vi.fn(),
				requestFrame: vi.fn(),
			};

			const mockView = {
				canvas: mockCanvas,
				file: { name: "Test Canvas.canvas", path: "/path/to/Test Canvas.canvas" },
			};

			const mockLeaf = { view: mockView };
			mockApp.workspace.getLeavesOfType.mockReturnValue([mockLeaf]);

			const context = createMockInferenceContext({
				canvasFileName: "Test Canvas.canvas",
			});

			await service.createResponseNodeWithContext(
				context,
				"Test",
				false,
				vi.fn().mockReturnValue("test-id"),
			);

			expect(mockCanvas.importData).toHaveBeenCalled();
		});

		it("should find canvas by file path match", async () => {
			const mockCanvas = {
				getData: vi.fn().mockReturnValue(createMockCanvasData()),
				importData: vi.fn(),
				requestFrame: vi.fn(),
			};

			const mockView = {
				canvas: mockCanvas,
				file: {
					name: "Test Canvas.canvas",
					path: "/path/to/Test Canvas.canvas",
				},
			};

			const mockLeaf = { view: mockView };
			mockApp.workspace.getLeavesOfType.mockReturnValue([mockLeaf]);

			const context = createMockInferenceContext({
				canvasFileName: "/path/to/Test Canvas.canvas",
			});

			await service.createResponseNodeWithContext(
				context,
				"Test",
				false,
				vi.fn().mockReturnValue("test-id"),
			);

			expect(mockCanvas.importData).toHaveBeenCalled();
		});

		it("should find canvas by name without extension", async () => {
			const mockCanvas = {
				getData: vi.fn().mockReturnValue(createMockCanvasData()),
				importData: vi.fn(),
				requestFrame: vi.fn(),
			};

			const mockView = {
				canvas: mockCanvas,
				file: { name: "Test Canvas", path: "/path/to/Test Canvas.canvas" },
			};

			const mockLeaf = { view: mockView };
			mockApp.workspace.getLeavesOfType.mockReturnValue([mockLeaf]);

			const context = createMockInferenceContext({
				canvasFileName: "Test Canvas.canvas",
			});

			await service.createResponseNodeWithContext(
				context,
				"Test",
				false,
				vi.fn().mockReturnValue("test-id"),
			);

			expect(mockCanvas.importData).toHaveBeenCalled();
		});
	});
});