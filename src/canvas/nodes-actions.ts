import { type Menu } from "obsidian";
import type CanvasContextPlugin from "../main.ts";
import type { ExtendedCanvasConnection } from "../types/canvas-types.ts";

export default class NodeActions {
	plugin: CanvasContextPlugin;
	constructor(plugin: CanvasContextPlugin) {
		this.plugin = plugin;
	}
	buildNodeMenu(menu: Menu, node: ExtendedCanvasConnection) {
		menu.addItem((item) =>
			item
				.setTitle("Send to LLM")
				.setIcon("document")
				.onClick(async () => {
					if (node?.canvas?.data && node?.id) {
						this.plugin.runInference(node.id, node);
					} else {
						console.log("No canvas data or node id available");
					}
				}),
		);
	}
}
