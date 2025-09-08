import { type Menu } from "obsidian";
import type CanvasContextPlugin from "../main.ts";
import type { ExtendedCanvasConnection } from "../types/canvas-types.ts";
import { PLUGIN_ICON } from "../main.ts";

export default class NodeActions {
	plugin: CanvasContextPlugin;
	constructor(plugin: CanvasContextPlugin) {
		this.plugin = plugin;
	}
	buildNodeMenu(menu: Menu, node: ExtendedCanvasConnection) {
		menu.addItem((item) =>
			item
				.setTitle("Canvas Context: Run Inference")
				.setIcon(PLUGIN_ICON)
				.onClick(async () => {
					if (node?.canvas?.data && node?.id) {
						this.plugin.runInference(node.id, node);
					} else {
						console.log("No canvas data or node id available");
					}
				}),
		);

		// Add a separator and selection-based inference if multiple nodes are selected
		if (node?.canvas) {
			try {
				const canvas = node.canvas;

				// Try different methods to get selection
				let selectedCount = 0;
				let selectedNodes: any[] = [];

				// Method 1: Try using canvas.selection if it exists
				if (canvas.selection && canvas.selection.size > 0) {
					selectedCount = canvas.selection.size;
					selectedNodes = Array.from(canvas.selection);
					console.log("Selection via canvas.selection:", selectedCount);
				}

				// Method 2: Try using getSelectionData if it exists
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
							console.log("Selection via getSelectionData:", selectedCount);
						}
					} catch (e) {
						console.log("getSelectionData failed:", e);
					}
				}

				// Method 3: Check if the canvas has any indication of multiple selection
				console.log("Canvas object properties:", Object.keys(canvas));
				console.log("Node menu triggered, selection count:", selectedCount);

				if (selectedCount > 1) {
					menu.addSeparator();
					menu.addItem((item) =>
						item
							.setTitle(
								`Canvas Context: Run on ${selectedCount} Selected Nodes`,
							)
							.setIcon(PLUGIN_ICON)
							.onClick(async () => {
								// Run inference on the current node (since we know it's selected)
								console.log("Running inference on selected node:", node.id);

								if (node?.canvas?.data && node?.id) {
									await this.plugin.runInference(node.id, node);
								} else {
									console.log("No canvas data or node id available");
								}
							}),
					);
				}
			} catch (error) {
				console.log("Could not check selection data:", error);
			}
		}
	}
}
