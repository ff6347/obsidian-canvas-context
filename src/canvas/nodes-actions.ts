import type { Menu } from "obsidian";
import type { CanvasConnection, CanvasViewCanvas } from "obsidian-typings";
import type CanvasContextPlugin from "src/main.js";
import { canvasGraphWalker } from "./walker.js";

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
				.onClick(() => {
					// Use the passed `node` object to act on model (inspect properties in runtime)
					console.log("node clicked");
					// console.log(node);
					// console.log(node.canvas?.data);
					// console.log(node.id);
					if (node?.canvas?.data && node?.id) {
						canvasGraphWalker(node.id, node.canvas.data, this.ctx.app)
							.then((messages) => {
								console.log({ messages });
							})
							.catch((error) => {
								console.error("Walker error:", error);
							});
					} else {
						console.log("No canvas data or node id available");
					}
				}),
		);
	}
}
