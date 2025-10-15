/* oxlint-disable eslint/max-lines-per-function */

import { describe, expect, it } from "vitest";
import {
	buildUpdatedCanvasData,
	calculateResponseNodePosition,
	captureInferenceContext,
	createResponseEdge,
	createResponseNodeData,
	findNodeById,
	getFallbackPosition,
	matchCanvasFileName,
	validateCanvasData,
} from "../../src/lib/canvas-logic.ts";
import type {
	CanvasData,
	CanvasNodeData,
} from "../../src/types/canvas-types.ts";

/**
 * Pure unit tests for canvas logic functions
 * Zero mocks, zero Obsidian dependencies, fast execution
 */

describe("calculateResponseNodePosition", () => {
	it("should position response node below source with default offset", () => {
		const sourcePosition = { x: 100, y: 200, width: 200, height: 100 };
		const result = calculateResponseNodePosition(sourcePosition);

		expect(result).toEqual({
			x: 100,
			y: 350, // 200 + 100 + 50
			width: 400,
			height: 200,
		});
	});

	it("should apply custom offset", () => {
		const sourcePosition = { x: 100, y: 200, width: 200, height: 100 };
		const result = calculateResponseNodePosition(sourcePosition, {
			x: 10,
			y: 20,
		});

		expect(result).toEqual({
			x: 110, // 100 + 10
			y: 320, // 200 + 100 + 20
			width: 400,
			height: 200,
		});
	});

	it("should handle partial offset", () => {
		const sourcePosition = { x: 50, y: 100, width: 150, height: 80 };
		const result = calculateResponseNodePosition(sourcePosition, { y: 75 });

		expect(result).toEqual({
			x: 50, // No x offset
			y: 255, // 100 + 80 + 75
			width: 400,
			height: 200,
		});
	});

	it("should handle negative positions", () => {
		const sourcePosition = { x: -50, y: -100, width: 100, height: 50 };
		const result = calculateResponseNodePosition(sourcePosition);

		expect(result).toEqual({
			x: -50,
			y: 0, // -100 + 50 + 50
			width: 400,
			height: 200,
		});
	});
});

describe("createResponseNodeData", () => {
	it("should create assistant response node", () => {
		const position = { x: 100, y: 200, width: 400, height: 200 };
		const result = createResponseNodeData(
			"response-123",
			position,
			"Test response",
		);

		expect(result).toEqual({
			type: "text",
			text: "---\nrole: assistant\n\n---\n\nTest response",
			id: "response-123",
			x: 100,
			y: 200,
			width: 400,
			height: 200,
			color: "3",
		});
	});

	it("should create error response node", () => {
		const position = { x: 50, y: 100, width: 300, height: 150 };
		const result = createResponseNodeData(
			"error-456",
			position,
			"Error message",
			true,
		);

		expect(result).toEqual({
			type: "text",
			text: "---\nrole: error\n\n---\n\nError message",
			id: "error-456",
			x: 50,
			y: 100,
			width: 300,
			height: 150,
			color: "1",
		});
	});

	it("should handle empty response text", () => {
		const position = { x: 0, y: 0, width: 400, height: 200 };
		const result = createResponseNodeData("empty-789", position, "");

		expect(result.text).toBe("---\nrole: assistant\n\n---\n\n");
		expect(result.id).toBe("empty-789");
	});

	it("should handle multiline response text", () => {
		const position = { x: 0, y: 0, width: 400, height: 200 };
		const multilineText = "Line 1\nLine 2\nLine 3";
		const result = createResponseNodeData("multi-123", position, multilineText);

		expect(result.text).toBe(
			"---\nrole: assistant\n\n---\n\nLine 1\nLine 2\nLine 3",
		);
	});
});

describe("createResponseEdge", () => {
	it("should create edge from source to response", () => {
		const result = createResponseEdge("edge-123", "source-456", "response-789");

		expect(result).toEqual({
			id: "edge-123",
			fromNode: "source-456",
			toNode: "response-789",
			fromSide: "bottom",
			toSide: "top",
		});
	});

	it("should handle different ID formats", () => {
		const result = createResponseEdge("uuid-abc-def", "node_1", "node_2");

		expect(result.id).toBe("uuid-abc-def");
		expect(result.fromNode).toBe("node_1");
		expect(result.toNode).toBe("node_2");
	});
});

describe("buildUpdatedCanvasData", () => {
	it("should add new node and edge to canvas data", () => {
		const currentData: CanvasData = {
			nodes: [
				{ id: "existing-1", type: "text", x: 0, y: 0, width: 100, height: 100 },
			],
			edges: [
				{
					id: "existing-edge",
					fromNode: "node1",
					toNode: "node2",
					fromSide: "right",
					toSide: "left",
				},
			],
		};

		const newNode = {
			id: "new-node",
			type: "text",
			x: 100,
			y: 100,
			width: 200,
			height: 150,
		} as CanvasNodeData;
		const newEdge = {
			id: "new-edge",
			fromNode: "existing-1",
			toNode: "new-node",
			fromSide: "bottom",
			toSide: "top",
		};

		const result = buildUpdatedCanvasData(currentData, newNode, newEdge);

		expect(result.nodes).toHaveLength(2);
		expect(result.edges).toHaveLength(2);
		expect(result.nodes[1]).toBe(newNode);
		expect(result.edges[1]).toBe(newEdge);
	});

	it("should not mutate original data", () => {
		const currentData: CanvasData = {
			nodes: [
				{
					id: "test",
					type: "text",
					text: "Test",
					x: 0,
					y: 0,
					width: 100,
					height: 100,
				},
			],
			edges: [],
		};

		const newNode = {
			id: "new",
			type: "text",
			x: 50,
			y: 50,
			width: 100,
			height: 100,
		} as CanvasNodeData;
		const newEdge = {
			id: "edge",
			fromNode: "test",
			toNode: "new",
			fromSide: "right",
			toSide: "left",
		};

		const result = buildUpdatedCanvasData(currentData, newNode, newEdge);

		expect(currentData.nodes).toHaveLength(1);
		expect(currentData.edges).toHaveLength(0);
		expect(result.nodes).toHaveLength(2);
		expect(result.edges).toHaveLength(1);
	});
});

describe("captureInferenceContext", () => {
	const mockGenerateId = () => "mock-id-123";

	it("should capture context from valid canvas data", () => {
		const canvasData: CanvasData = {
			nodes: [
				{
					id: "target-node",
					type: "text",
					x: 100,
					y: 200,
					width: 300,
					height: 150,
				},
				{ id: "other-node", type: "text", x: 0, y: 0, width: 100, height: 100 },
			],
			edges: [],
		};

		const result = captureInferenceContext(
			"test.canvas",
			"target-node",
			canvasData,
			mockGenerateId,
		);

		expect(result).toEqual({
			id: "mock-id-123",
			canvasFileName: "test.canvas",
			sourceNodeId: "target-node",
			sourceNodePosition: {
				x: 100,
				y: 200,
				width: 300,
				height: 150,
			},
			timestamp: expect.any(Number),
		});
	});

	it("should throw error for missing canvas data", () => {
		expect(() => {
			captureInferenceContext(
				"test.canvas",
				"node-id",
				null as any,
				mockGenerateId,
			);
		}).toThrow("No canvas data available for test.canvas");
	});

	it("should throw error for missing node", () => {
		const canvasData: CanvasData = {
			nodes: [
				{ id: "other-node", type: "text", x: 0, y: 0, width: 100, height: 100 },
			],
			edges: [],
		};

		expect(() => {
			captureInferenceContext(
				"test.canvas",
				"missing-node",
				canvasData,
				mockGenerateId,
			);
		}).toThrow("Source node missing-node not found in canvas test.canvas");
	});

	it("should include timestamp close to current time", () => {
		const canvasData: CanvasData = {
			nodes: [
				{ id: "node", type: "text", x: 0, y: 0, width: 100, height: 100 },
			],
			edges: [],
		};

		const before = Date.now();
		const result = captureInferenceContext(
			"test.canvas",
			"node",
			canvasData,
			mockGenerateId,
		);
		const after = Date.now();

		expect(result.timestamp).toBeGreaterThanOrEqual(before);
		expect(result.timestamp).toBeLessThanOrEqual(after);
	});
});

describe("findNodeById", () => {
	it("should find existing node", () => {
		const canvasData: CanvasData = {
			nodes: [
				{ id: "node-1", type: "text", x: 0, y: 0, width: 100, height: 100 },
				{ id: "node-2", type: "text", x: 100, y: 100, width: 150, height: 120 },
			],
			edges: [],
		};

		const result = findNodeById(canvasData, "node-2");

		expect(result).toEqual({
			id: "node-2",
			type: "text",
			x: 100,
			y: 100,
			width: 150,
			height: 120,
		});
	});

	it("should return undefined for missing node", () => {
		const canvasData: CanvasData = {
			nodes: [
				{ id: "node-1", type: "text", x: 0, y: 0, width: 100, height: 100 },
			],
			edges: [],
		};

		const result = findNodeById(canvasData, "missing-node");

		expect(result).toBeUndefined();
	});

	it("should handle empty canvas", () => {
		const canvasData: CanvasData = { nodes: [], edges: [] };

		const result = findNodeById(canvasData, "any-node");

		expect(result).toBeUndefined();
	});
});

describe("validateCanvasData", () => {
	it("should validate correct canvas data", () => {
		const validData = {
			nodes: [
				{ id: "node-1", x: 0, y: 0, width: 100, height: 100 },
				{ id: "node-2", x: 50, y: 50, width: 150, height: 120 },
			],
			edges: [{ id: "edge-1", fromNode: "node-1", toNode: "node-2" }],
		};

		expect(validateCanvasData(validData)).toBe(true);
	});

	it("should reject null or undefined", () => {
		expect(validateCanvasData(null)).toBe(false);
		expect(validateCanvasData(undefined)).toBe(false);
	});

	it("should reject non-objects", () => {
		expect(validateCanvasData("string")).toBe(false);
		expect(validateCanvasData(123)).toBe(false);
		expect(validateCanvasData([])).toBe(false);
	});

	it("should reject missing nodes array", () => {
		const invalidData = { edges: [] };
		expect(validateCanvasData(invalidData)).toBe(false);
	});

	it("should reject missing edges array", () => {
		const invalidData = { nodes: [] };
		expect(validateCanvasData(invalidData)).toBe(false);
	});

	it("should reject invalid node structure", () => {
		const invalidData = {
			nodes: [{ id: "node-1" }], // Missing x, y
			edges: [],
		};
		expect(validateCanvasData(invalidData)).toBe(false);
	});

	it("should reject nodes with wrong types", () => {
		const invalidData = {
			nodes: [{ id: 123, x: "0", y: 0 }], // Wrong types
			edges: [],
		};
		expect(validateCanvasData(invalidData)).toBe(false);
	});
});

describe("getFallbackPosition", () => {
	it("should return consistent fallback position", () => {
		const result1 = getFallbackPosition();
		const result2 = getFallbackPosition();

		expect(result1).toEqual({
			x: 100,
			y: 50,
			width: 400,
			height: 200,
		});
		expect(result1).toEqual(result2);
	});
});

describe("matchCanvasFileName", () => {
	it("should match exact file names", () => {
		expect(matchCanvasFileName("test.canvas", "test.canvas")).toBe(true);
		expect(matchCanvasFileName("my-canvas.canvas", "my-canvas.canvas")).toBe(
			true,
		);
	});

	it("should match exact file paths", () => {
		expect(
			matchCanvasFileName(
				"folder/test.canvas",
				undefined,
				"folder/test.canvas",
			),
		).toBe(true);
	});

	it("should match name without extension", () => {
		expect(matchCanvasFileName("test.canvas", "test")).toBe(true);
		expect(matchCanvasFileName("my-canvas.canvas", "my-canvas")).toBe(true);
	});

	it("should match path ending with target", () => {
		expect(
			matchCanvasFileName("test.canvas", undefined, "some/path/test.canvas"),
		).toBe(true);
		expect(
			matchCanvasFileName(
				"my-canvas.canvas",
				undefined,
				"folder/subfolder/my-canvas.canvas",
			),
		).toBe(true);
	});

	it("should not match different names", () => {
		expect(matchCanvasFileName("test.canvas", "other.canvas")).toBe(false);
		expect(matchCanvasFileName("test.canvas", "test2.canvas")).toBe(false);
	});

	it("should handle missing candidate values", () => {
		expect(matchCanvasFileName("test.canvas", undefined, undefined)).toBe(
			false,
		);
		expect(matchCanvasFileName("test.canvas")).toBe(false);
	});

	it("should handle empty strings", () => {
		expect(matchCanvasFileName("test.canvas", "")).toBe(false);
		expect(matchCanvasFileName("test.canvas", undefined, "")).toBe(false);
	});

	it("should prioritize direct matches over partial matches", () => {
		// When both name and path are provided, should match on either
		expect(
			matchCanvasFileName("test.canvas", "test.canvas", "wrong/path"),
		).toBe(true);
		expect(
			matchCanvasFileName("test.canvas", "wrong-name", "test.canvas"),
		).toBe(true);
	});
});
