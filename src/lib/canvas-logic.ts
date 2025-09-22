import type {
	CanvasData,
	CanvasNodeData,
	CanvasTextData,
	InferenceContext,
} from "../types/canvas-types.ts";

/**
 * Pure canvas logic functions
 * No Obsidian dependencies - can be tested without mocks
 */

interface NodePosition {
	x: number;
	y: number;
	width: number;
	height: number;
}

interface EdgeData {
	id: string;
	fromNode: string;
	toNode: string;
	fromSide: string;
	toSide: string;
}

interface CanvasUpdateData {
	nodes: CanvasNodeData[];
	edges: EdgeData[];
}

/**
 * Calculate position for a response node relative to source node
 */
export function calculateResponseNodePosition(
	sourcePosition: NodePosition,
	offset: { x?: number; y?: number } = {},
): NodePosition {
	const defaultOffset = { x: 0, y: 50 };
	const actualOffset = { ...defaultOffset, ...offset };

	return {
		x: sourcePosition.x + actualOffset.x,
		y: sourcePosition.y + sourcePosition.height + actualOffset.y,
		width: 400, // Default response node width
		height: 200, // Default response node height
	};
}

/**
 * Create response node data structure
 */
export function createResponseNodeData(
	responseId: string,
	position: NodePosition,
	responseText: string,
	isError: boolean = false,
): CanvasTextData {
	const role = isError ? "error" : "assistant";
	const color = isError ? "1" : "3";

	return {
		type: "text",
		text: `---\nrole: ${role}\n\n---\n\n${responseText}`,
		id: responseId,
		x: position.x,
		y: position.y,
		width: position.width,
		height: position.height,
		color,
	};
}

/**
 * Create edge data connecting source to response node
 */
export function createResponseEdge(
	edgeId: string,
	sourceNodeId: string,
	responseNodeId: string,
): EdgeData {
	return {
		id: edgeId,
		fromNode: sourceNodeId,
		toNode: responseNodeId,
		fromSide: "bottom",
		toSide: "top",
	};
}

/**
 * Build updated canvas data with new node and edge
 */
export function buildUpdatedCanvasData(
	currentData: CanvasData,
	newNode: CanvasNodeData,
	newEdge: EdgeData,
): CanvasUpdateData {
	return {
		nodes: [...currentData.nodes, newNode],
		edges: [...currentData.edges, newEdge],
	};
}

/**
 * Capture inference context from canvas data
 */
export function captureInferenceContext(
	canvasFileName: string,
	nodeId: string,
	canvasData: CanvasData,
	generateId: (length?: number) => string,
): InferenceContext {
	if (!canvasData) {
		throw new Error(`No canvas data available for ${canvasFileName}`);
	}

	const sourceNode = canvasData.nodes.find((n) => n.id === nodeId);

	if (!sourceNode) {
		throw new Error(
			`Source node ${nodeId} not found in canvas ${canvasFileName}`,
		);
	}

	return {
		id: generateId(),
		canvasFileName,
		sourceNodeId: nodeId,
		sourceNodePosition: {
			x: sourceNode.x,
			y: sourceNode.y,
			width: sourceNode.width,
			height: sourceNode.height,
		},
		timestamp: Date.now(),
	};
}

/**
 * Find node by ID in canvas data
 */
export function findNodeById(
	canvasData: CanvasData,
	nodeId: string,
): CanvasNodeData | undefined {
	return canvasData.nodes.find((n) => n.id === nodeId);
}

/**
 * Validate canvas data structure
 */
export function validateCanvasData(
	canvasData: unknown,
): canvasData is CanvasData {
	if (!canvasData || typeof canvasData !== "object") {
		return false;
	}

	const data = canvasData as any;
	return (
		Array.isArray(data.nodes) &&
		Array.isArray(data.edges) &&
		data.nodes.every(
			(node: any) =>
				typeof node === "object" &&
				typeof node.id === "string" &&
				typeof node.x === "number" &&
				typeof node.y === "number",
		)
	);
}

/**
 * Get fallback position when source node not found
 */
export function getFallbackPosition(): NodePosition {
	return {
		x: 100,
		y: 50,
		width: 400,
		height: 200,
	};
}

/**
 * Match canvas file names with different strategies
 */
export function matchCanvasFileName(
	targetFileName: string,
	candidateFileName?: string,
	candidateFilePath?: string,
): boolean {
	if (!candidateFileName && !candidateFilePath) {
		return false;
	}

	// Direct name match
	if (candidateFileName === targetFileName) {
		return true;
	}

	// Direct path match
	if (candidateFilePath === targetFileName) {
		return true;
	}

	// Name without extension match
	if (candidateFileName === targetFileName.replace(".canvas", "")) {
		return true;
	}

	// Path ends with target
	if (candidateFilePath?.endsWith(targetFileName)) {
		return true;
	}

	return false;
}
