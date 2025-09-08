import { Plugin, Menu, WorkspaceLeaf } from "obsidian";
import NodeActions from "./canvas/nodes-actions.ts";
import type { CanvasConnection, CanvasViewData } from "obsidian-typings";
import { CanvasContextSettingTab } from "./ui/settings.ts";
import { CanvasContextView, VIEW_TYPE_CANVAS_CONTEXT } from "./ui/view.tsx";
import { Notice } from "obsidian";
import { inference, type InferenceResult } from "./llm/llm.ts";
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
	recentErrors: InferenceResult[] = [];

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
				
				const result = await inference({
					messages,
					currentProviderName: currentModelConfig.provider,
					currentModelName: currentModelConfig.modelName,
					baseURL: currentModelConfig.baseURL,
				});

				console.log("LLM inference result:", result);

				if (result.success) {
					// Create successful response node
					await this.createResponseNode(node, result.text, false);
					new Notice("LLM response added to canvas.");
				} else {
					// Store error for sidebar display
					this.addRecentError(result);
					// Create error node with detailed error information
					await this.createErrorNode(node, result);
					new Notice(`Inference failed: ${result.error}`, 5000);
				}
				
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
		isError: boolean = false,
	) {
		if (!sourceNode.canvas || !sourceNode.id) return;

		// Create response text with frontmatter
		const role = isError ? "error" : "assistant";
		const responseText = `---
role: ${role}

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
			color: isError ? "1" : "3", // Use color 1 (red) for errors, color 3 for assistant responses
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

	async createErrorNode(
		sourceNode: ExtendedCanvasConnection,
		result: InferenceResult,
	) {
		if (!sourceNode.canvas || !sourceNode.id || result.success) return;

		// Get current model configuration for context
		const currentModelConfig = this.settings.modelConfigurations.find(
			config => config.id === this.settings.currentModel
		);

		// Create detailed error message with configuration context
		const errorDetails = [
			`# ❌ Inference Error`,
			``,
			`**Error Type:** ${result.errorType || 'unknown'}`,
			`**Message:** ${result.error || 'Unknown error occurred'}`,
			``,
			`## Configuration`,
			currentModelConfig ? [
				`**Model:** ${currentModelConfig.name}`,
				`**Provider:** ${currentModelConfig.provider}`,
				`**Model Name:** ${currentModelConfig.modelName}`,
				`**Base URL:** ${currentModelConfig.baseURL}`,
			].join('\n') : '⚠️ No model configuration found',
			``,
			`## Troubleshooting`,
			this.getErrorTroubleshootingText(result.errorType, currentModelConfig?.provider),
		].join('\n');

		// Use the existing createResponseNode method with error flag
		await this.createResponseNode(sourceNode, errorDetails, true);
	}

	addRecentError(result: InferenceResult) {
		if (result.success) return;
		
		// Add timestamp to error
		const errorWithTimestamp = {
			...result,
			timestamp: Date.now()
		};
		
		// Keep only the 5 most recent errors
		this.recentErrors.unshift(errorWithTimestamp as InferenceResult);
		if (this.recentErrors.length > 5) {
			this.recentErrors = this.recentErrors.slice(0, 5);
		}
	}

	getErrorTroubleshootingText(errorType?: string, provider?: string): string {
		const baseSteps = [];
		
		switch (errorType) {
			case 'connection':
				baseSteps.push(
					'- Check if the provider service is running',
					'- Verify the base URL is correct',
					'- Ensure network connectivity'
				);
				break;
			case 'model':
				baseSteps.push(
					'- Verify the model name exists on the provider',
					'- Check if the model is properly loaded',
					'- Try refreshing available models in the modal'
				);
				break;
			case 'provider':
				baseSteps.push(
					'- Ensure the provider is properly configured',
					'- Check provider settings in the plugin'
				);
				break;
			default:
				baseSteps.push(
					'- Check the console for detailed error information',
					'- Verify all configuration settings',
					'- Try running inference again'
				);
		}

		// Add provider-specific guidance
		const providerSteps = this.getProviderSpecificSteps(provider);
		if (providerSteps.length > 0) {
			baseSteps.push('', '### Provider-Specific Tips:', ...providerSteps);
		}

		return baseSteps.join('\n');
	}

	getProviderSpecificSteps(provider?: string): string[] {
		switch (provider) {
			case 'ollama':
				return [
					'**Ollama Setup:**',
					'- Default URL: `http://localhost:11434`',
					'- Start Ollama: `ollama serve`',
					'- List models: `ollama list`',
					'- Pull models: `ollama pull llama3.2`',
					'- Check status: visit http://localhost:11434 in browser'
				];
			case 'lmstudio':
				return [
					'**LM Studio Setup:**',
					'- Default URL: `http://localhost:1234`',
					'- Enable "Start Server" in LM Studio',
					'- Load a model in the Local Server tab',
					'- Verify server is running in the Server tab',
					'- Check endpoint: visit http://localhost:1234/v1/models'
				];
			default:
				return [];
		}
	}

	generateId(length: number = 16): string {
		let result: string[] = [];
		for (let i = 0; i < length; i++) {
			result.push(((16 * Math.random()) | 0).toString(16));
		}
		return result.join("");
	}
}
