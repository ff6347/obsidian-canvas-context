import { Notice, type Menu } from "obsidian";
import type { CanvasConnection, CanvasViewCanvas } from "obsidian-typings";
import type CanvasContextPlugin from "src/main.js";
import { canvasGraphWalker } from "./walker.js";
import { inference } from "src/llm/llm.js";

// Canvas API types
interface CanvasData {
	nodes: CanvasNodeData[];
	edges: CanvasEdgeData[];
}

interface CanvasNodeData {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	type: "text" | "file" | "group";
	color?: string;
}

interface CanvasTextData extends CanvasNodeData {
	type: "text";
	text: string;
}

interface CanvasEdgeData {
	id: string;
	fromNode: string;
	toNode: string;
	fromSide: string;
	toSide: string;
}

// type CanvasDataEdgeConnection = "bottom" | "top" | "left" | "right";
// interface CanvasDataNode {
// 	file: string;
// 	height: number;
// 	id: string;
// 	subpath?: string;
// 	type: "file" | "text" | "url";
// 	width: number;
// 	x: number;
// 	y: number;
// }
// interface CanvasDataEdge {
// 	fromNode: string;
// 	fromSide: CanvasDataEdgeConnection;
// 	id: string;
// 	toNode: string;
// 	toSide: CanvasDataEdgeConnection;
// }
interface ExtendedCanvasConnection extends CanvasConnection {
	id?: string;
	canvas?: CanvasViewCanvas;
}

export default class NodeActions {
	ctx: CanvasContextPlugin;
	constructor(that: CanvasContextPlugin) {
		this.ctx = that;
	}
	buildNodeMenu(menu: Menu, node: ExtendedCanvasConnection) {
		menu.addItem((item) =>
			item
				.setTitle("Send to LLM")
				.setIcon("document")
				.onClick(async () => {
					// Use the passed `node` object to act on model (inspect properties in runtime)
					console.log("node clicked");
					// console.log(node);
					// console.log(node.canvas?.data);
					// console.log(node.id);
					if (node?.canvas?.data && node?.id) {
						const messages = [];

						try {
							const res = await canvasGraphWalker(
								node.id,
								node.canvas.data,
								this.ctx.app,
							);
							messages.push(...res);
						} catch (error) {
							console.error("Error in canvasGraphWalker:", error);
							new Notice(
								"Error processing canvas data. Check console for details.",
							);
							return;
						}
						try {
							console.log({ messages });
							this.ctx.showLoadingStatus("Running inference...");
							const response = await inference(messages);

							console.log("LLM response:", response);

							// Create response node with frontmatter
							await this.createResponseNode(node, response);

							new Notice("LLM response added to canvas.");
							this.ctx.hideLoadingStatus();
						} catch (error) {
							console.error("Inference error:", error);
							new Notice(
								"Error during LLM inference. Check console for details.",
							);
							this.ctx.hideLoadingStatus();
						}
					} else {
						console.log("No canvas data or node id available");
					}
				}),
		);
	}

	generateId(length: number = 16): string {
		let result = [];
		for (let i = 0; i < length; i++) {
			result.push(((16 * Math.random()) | 0).toString(16));
		}
		return result.join("");
	}

	async createResponseNode(
		sourceNode: ExtendedCanvasConnection,
		response: string,
	) {
		if (!sourceNode.canvas || !sourceNode.id) return;

		// Create response text with frontmatter
		const responseText = `---
role: assistant

---

${response}`;

		console.log("Created response text:", responseText);

		// Generate unique IDs
		const responseId = this.generateId(16);
		const edgeId = this.generateId(16);

		// Get current canvas data
		const currentData = (sourceNode.canvas as any).getData() as CanvasData;
		if (!currentData) return;

		// Position the response node below the source node
		const sourceNodeData = currentData.nodes.find(
			(n: CanvasNodeData) => n.id === sourceNode.id,
		);
		const positionX = sourceNodeData ? sourceNodeData.x : 100;
		const positionY = sourceNodeData
			? sourceNodeData.y + sourceNodeData.height + 50
			: 100;

		// Create text node using proper Canvas API types
		const responseNodeData: CanvasTextData = {
			type: "text",
			text: responseText,
			id: responseId,
			x: positionX,
			y: positionY,
			width: 400,
			height: 200,
			color: "3", // Use color 3 for assistant responses
		};

		// Create edge data - connect from bottom to top
		const edgeData = {
			id: edgeId,
			fromNode: sourceNode.id,
			toNode: responseId,
			fromSide: "bottom",
			toSide: "top",
		};

		// Import new data with both existing and new nodes/edges
		const newData: CanvasData = {
			nodes: [...currentData.nodes, responseNodeData],
			edges: [...currentData.edges, edgeData],
		};

		// Use Canvas API to import the updated data
		(sourceNode.canvas as any).importData(newData);
		(sourceNode.canvas as any).requestFrame();
	}
}
