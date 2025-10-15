import type {
	CanvasData,
	CanvasNodeData,
	CanvasTextData,
} from "../../src/types/canvas-types.ts";

/**
 * Factory functions for generating consistent test data across all test files.
 * These factories provide sensible defaults with the ability to override specific properties.
 */

let idCounter = 1;

/**
 * Generate a unique test ID for consistent test data creation
 */
const generateTestId = (prefix = "test"): string => `${prefix}-${idCounter++}`;

/**
 * Create mock canvas node data
 */
const createMockCanvasNode = (
	overrides?: Partial<CanvasNodeData>,
): CanvasNodeData => ({
	id: generateTestId("node"),
	type: "text",
	x: 0,
	y: 0,
	width: 200,
	height: 100,
	...overrides,
});

/**
 * Create mock canvas text node data
 */
const createMockCanvasTextNode = (
	overrides?: Partial<CanvasTextData>,
): CanvasTextData => {
	return {
		...createMockCanvasNode({ type: "text" }),
		text: "---\nrole: user\n---\nTest content",
		...overrides,
	} as CanvasTextData;
};

/**
 * Create mock canvas edge data
 */
const createMockCanvasEdge = (overrides?: {
	id?: string;
	fromNode?: string;
	toNode?: string;
	fromSide?: string;
	toSide?: string;
}) => ({
	id: generateTestId("edge"),
	fromNode: generateTestId("node"),
	toNode: generateTestId("node"),
	fromSide: "bottom",
	toSide: "top",
	...overrides,
});

/**
 * Create complete mock canvas data structure
 */
export const createMockCanvasData = (overrides?: {
	nodes?: CanvasNodeData[];
	edges?: ReturnType<typeof createMockCanvasEdge>[];
}): CanvasData => {
	const node1 = createMockCanvasNode({ id: "node1", type: "file" });
	const node2 = createMockCanvasTextNode({ id: "node2", x: 0, y: 200 });

	return {
		nodes: [node1, node2],
		edges: [
			createMockCanvasEdge({
				id: "edge1",
				fromNode: "node1",
				toNode: "node2",
			}),
		],
		...overrides,
	};
};
