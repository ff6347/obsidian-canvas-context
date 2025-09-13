import { type Menu } from "obsidian";
import type CanvasContextPlugin from "../main.ts";
import { isSelectionData } from "../main.ts";
import type { ExtendedCanvasConnection } from "../types/canvas-types.ts";
import { PLUGIN_DISPLAY_NAME, PLUGIN_ICON } from "../lib/constants.ts";

export default class NodeActions {
	plugin: CanvasContextPlugin;
	constructor(plugin: CanvasContextPlugin) {
		this.plugin = plugin;
	}
	buildNodeMenu(menu: Menu, node: ExtendedCanvasConnection) {
		menu.addItem((item) =>
			item
				.setTitle(`${PLUGIN_DISPLAY_NAME}: Run Inference`)
				.setIcon(PLUGIN_ICON)
				.onClick(() => {
					if (node?.canvas?.data && node?.id) {
						this.plugin.runInference(node.id, node.canvas);
					}
				}),
		);

		// Add a separator and selection-based inference if multiple nodes are selected
		if (node?.canvas) {
			try {
				const { canvas } = node;

				// Try different methods to get selection
				let selectedCount = 0;
				let selectedNodes: Array<{ id: string; [key: string]: unknown }> = [];

				// Try using canvas.selection if it exists
				if (canvas.selection && canvas.selection.size > 0) {
					selectedCount = canvas.selection.size;
					// Selection objects may not have the same structure as nodes
					// so we'll rely on getSelectionData for the actual node data
				}

				// Try using getSelectionData if it exists
				if (
					canvas.getSelectionData &&
					typeof canvas.getSelectionData === "function"
				) {
					try {
						const selectionData = canvas.getSelectionData(undefined);
						if (isSelectionData(selectionData)) {
							selectedNodes = selectionData.nodes;
							selectedCount = selectedNodes.length;
						}
					} catch (e) {
						console.error("getSelectionData failed:", e);
					}
				}

				if (selectedCount > 1) {
					menu.addSeparator();
					menu.addItem((item) =>
						item
							.setTitle(
								`${PLUGIN_DISPLAY_NAME}: Run on ${selectedCount} Selected Nodes`,
							)
							.setIcon(PLUGIN_ICON)
							.onClick(async () => {
								if (node?.canvas?.data && node?.id) {
									await this.plugin.runInference(node.id, node.canvas);
								}
							}),
					);
				}
			} catch (error) {
				console.error("Could not check selection data:", error);
			}
		}
	}
}
