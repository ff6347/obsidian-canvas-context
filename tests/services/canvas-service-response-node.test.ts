/* oxlint-disable eslint/max-lines-per-function */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CanvasService } from "../../src/services/canvas-service.ts";
import { createMockApp } from "../mocks/obsidian-extended.ts";
import { createMockCanvasData } from "../mocks/factories.ts";
import type {
	CanvasData,
	ExtendedCanvasConnection,
} from "../../src/types/canvas-types.ts";
import { TestNotificationAdapter } from "../adapters/test-notification-adapter.ts";

// Mock Obsidian classes
vi.mock("obsidian", () => ({
	Notice: vi.fn(),
	TextFileView: vi.fn(),
	WorkspaceLeaf: vi.fn(),
}));

describe("CanvasService - Response Node", () => {
	let service: CanvasService;
	let mockApp: ReturnType<typeof createMockApp>;
	let testNotificationAdapter: TestNotificationAdapter;

	beforeEach(() => {
		vi.clearAllMocks();
		mockApp = createMockApp();
		testNotificationAdapter = new TestNotificationAdapter();
		service = new CanvasService(mockApp as any);
	});

	afterEach(() => {
		vi.resetAllMocks();
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
				id: mockCanvasData.nodes[0]!.id,
			} as any;
			mockGenerateId = vi
				.fn()
				.mockReturnValueOnce("response-node-id")
				.mockReturnValueOnce("edge-id");
		});

		it("should create assistant response node with proper formatting", () => {
			const response = "This is the LLM response";

			service.createResponseNode(
				mockSourceNode,
				response,
				false,
				mockGenerateId,
			);

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

			service.createResponseNode(
				mockSourceNode,
				response,
				false,
				mockGenerateId,
			);

			const importCall = mockCanvas.importData.mock.calls[0][0];
			const responseNode = importCall.nodes.find(
				(n: any) => n.id === "response-node-id",
			);

			expect(responseNode.x).toBe(sourceNodeData!.x);
			expect(responseNode.y).toBe(
				sourceNodeData!.y + sourceNodeData!.height + 50,
			);
		});

		it("should handle missing source node data by showing error", () => {
			const mockCanvasDataWithoutSource = {
				nodes: [], // No matching source node
				edges: [],
			};
			mockCanvas.getData.mockReturnValue(mockCanvasDataWithoutSource);

			service.createResponseNode(mockSourceNode, "Test", false, mockGenerateId);

			// Verify that error notification was called
			const errorMessages = testNotificationAdapter.messages.filter(
				(m) => m.type === "error",
			);
			expect(errorMessages).toHaveLength(1);
			expect(errorMessages[0]!.message).toBe("Source node not found in canvas");
			// Verify that no canvas import was called (early return)
			expect(mockCanvas.importData).not.toHaveBeenCalled();
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
});
