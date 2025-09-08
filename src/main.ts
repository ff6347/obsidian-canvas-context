import { Plugin, Menu, WorkspaceLeaf } from "obsidian";
import NodeActions from "./canvas/nodes-actions.ts";
import type { CanvasConnection, CanvasViewData } from "obsidian-typings";
import { CanvasContextSettingTab } from "./ui/settings.ts";
import { CanvasContextView, VIEW_TYPE_CANVAS_CONTEXT } from "./ui/view.tsx";
import { Notice } from "obsidian";
import { inference } from "./llm/llm.ts";
import type { ModelMessage } from "ai";
import { canvasGraphWalker } from "./canvas/walker.ts";
import type {
	CanvasData,
	CanvasNodeData,
	CanvasTextData,
	ExtendedCanvasConnection,
} from "./types/canvas-types.ts";
import type { CurrentProviderType } from "./types/llm-types.ts";

export interface ModelConfiguration {
	id: string;
	name: string;
	provider: CurrentProviderType;
	modelName: string;
	baseURL: string;
	enabled: boolean;
}

interface CanvasContextSettings {
	currentModel: string;
	modelConfigurations: ModelConfiguration[];
}

const DEFAULT_SETTINGS: CanvasContextSettings = {
	currentModel: "",
	modelConfigurations: [],
};

export default class CanvasContextPlugin extends Plugin {
	nodeActions: NodeActions | undefined;
	statusEl: HTMLElement | null = null;

	settings: CanvasContextSettings = DEFAULT_SETTINGS;
	async onload() {
		await this.loadSettings();
		this.registerView(
			VIEW_TYPE_CANVAS_CONTEXT,
			(leaf) => new CanvasContextView(leaf, this),
		);

		this.addRibbonIcon("waypoints", "Activate view", () => {
			this.activateView();
		});

		this.statusEl = this.addStatusBarItem();
		this.statusEl.addClass("canvas-context-loading-status");
		this.nodeActions = new NodeActions(this);

		// register Canvas menu handlers (Obsidian emits these events)
		this.registerEvent(
			this.app.workspace.on(
				"canvas:node-menu",
				(menu: Menu, node: CanvasConnection) => {
					if (this.nodeActions === undefined) {
						return;
					}
					this.nodeActions.buildNodeMenu(menu, node);
				},
			),
		);

		this.addSettingTab(new CanvasContextSettingTab(this.app, this));
	}

	onunload() {
		this.hideLoadingStatus();
	}

	showLoadingStatus(text = "Loading...") {
		if (!this.statusEl) return;
		this.statusEl.empty();
		this.statusEl.createEl("span", { text, cls: "loading-text" });
		this.statusEl.createEl("span", { cls: "spinner" });
	}

	hideLoadingStatus() {
		this.statusEl?.empty();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}
	async saveSettings() {
		await this.saveData(this.settings);
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;

		const leaves = workspace.getLeavesOfType(VIEW_TYPE_CANVAS_CONTEXT);

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			if (leaves[0]) leaf = leaves[0];
		} else {
			// Our view could not be found in the workspace, create a new leaf
			// in the right sidebar for it
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf === null) {
				console.log("not open");
			} else {
				leaf = rightLeaf;
				await leaf.setViewState({
					type: VIEW_TYPE_CANVAS_CONTEXT,
					active: true,
				});
			}
		}

		// "Reveal" the leaf in case it is in a collapsed sidebar
		if (leaf) workspace.revealLeaf(leaf);
	}

	/**
	 * Called inside the NodeActions when the user selects "Run Inference" from the node right click menu
	 * Gathers context from connected nodes, sends to LLM, creates response node
	 *
	 */
	async runInference(nodeId: string, node: ExtendedCanvasConnection) {
		{
			const messages: ModelMessage[] = [];

			if (!node.canvas?.data) {
				new Notice("No canvas data available on this node.");
				return;
			}
			try {
				const res = await canvasGraphWalker(nodeId, node.canvas.data, this.app);
				messages.push(...res);
			} catch (error) {
				console.error("Error in canvasGraphWalker:", error);
				new Notice("Error processing canvas data. Check console for details.");
				return;
			}
			try {
				console.log({ messages });
				this.showLoadingStatus("Running inference...");
				
				const currentModelConfig = this.settings.modelConfigurations.find(
					config => config.id === this.settings.currentModel && config.enabled
				);
				
				if (!currentModelConfig) {
					new Notice("Please select a valid model configuration in settings.");
					this.hideLoadingStatus();
					return;
				}
				
				const response = await inference({
					messages,
					currentProviderName: currentModelConfig.provider,
					currentModelName: currentModelConfig.modelName,
					baseURL: currentModelConfig.baseURL,
				});

				console.log("LLM response:", response);

				// Create response node with frontmatter
				await this.createResponseNode(node, response);

				new Notice("LLM response added to canvas.");
				this.hideLoadingStatus();
			} catch (error) {
				console.error("Inference error:", error);
				new Notice("Error during LLM inference. Check console for details.");
				this.hideLoadingStatus();
			}
		}
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
	generateId(length: number = 16): string {
		let result: string[] = [];
		for (let i = 0; i < length; i++) {
			result.push(((16 * Math.random()) | 0).toString(16));
		}
		return result.join("");
	}
}
