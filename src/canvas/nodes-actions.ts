import { type Menu } from "obsidian";
import type CanvasContextPlugin from "../main.ts";
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
				.onClick(async () => {
					if (node?.canvas?.data && node?.id) {
						this.plugin.runInference(node.id, node);
					}
				}),
		);

		// Add a separator and selection-based inference if multiple nodes are selected
		if (node?.canvas) {
			try {
				const { canvas } = node;

				// Try different methods to get selection
				let selectedCount = 0;
				let selectedNodes: any[] = [];

				// Try using canvas.selection if it exists
				if (canvas.selection && canvas.selection.size > 0) {
					selectedCount = canvas.selection.size;
					selectedNodes = Array.from(canvas.selection);
				}

				// Try using getSelectionData if it exists
				if (
					canvas.getSelectionData &&
					typeof canvas.getSelectionData === "function"
				) {
					try {
						const selectionData = (canvas as any).getSelectionData();
						if (
							selectionData &&
							selectionData.nodes &&
							Array.isArray(selectionData.nodes)
						) {
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
									await this.plugin.runInference(node.id, node);
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
