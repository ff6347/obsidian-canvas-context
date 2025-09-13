import {
	Events,
	ItemView,
	Menu,
	Notice,
	Plugin,
	WorkspaceLeaf,
	setIcon,
} from "obsidian";

import type { ModelMessage } from "ai";
import type { CanvasConnection } from "obsidian-typings";
import NodeActions from "./canvas/nodes-actions.ts";
import { canvasGraphWalker } from "./canvas/walker.ts";
import {
	PLUGIN_DISPLAY_NAME,
	PLUGIN_ICON,
	VIEW_TYPE_CANVAS_CONTEXT,
} from "./lib/constants.ts";
import { resolveApiKey } from "./lib/settings-utils.ts";
import { type InferenceResult, inference } from "./llm/llm.ts";
import type {
	CanvasData,
	CanvasNodeData,
	CanvasTextData,
	ExtendedCanvasConnection,
} from "./types/canvas-types.ts";
import {
	CanvasContextSettingTab,
	type CanvasContextSettings,
	DEFAULT_SETTINGS,
} from "./ui/settings.ts";
import { CanvasContextView } from "./ui/view.tsx";

export default class CanvasContextPlugin extends Plugin {
	nodeActions: NodeActions | undefined;
	statusEl: HTMLElement | null = null;
	recentErrors: InferenceResult[] = [];
	settings: CanvasContextSettings = DEFAULT_SETTINGS;
	settingsEvents: Events = new Events();
	private observers: MutationObserver[] = [];

	override async onload() {
		await this.loadSettings();
		this.registerView(
			VIEW_TYPE_CANVAS_CONTEXT,
			(leaf) => new CanvasContextView(leaf, this),
		);

		this.addRibbonIcon(
			PLUGIN_ICON,
			`Activate ${PLUGIN_DISPLAY_NAME} view`,
			() => {
				this.activateView();
			},
		);

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

		// Register canvas selection menu handler for toolbar button (backup approach)
		this.registerEvent(
			this.app.workspace.on(
				"canvas:selection-menu",
				(menu: Menu, canvas: any) => {
					this.buildSelectionMenu(menu, canvas);
				},
			),
		);

		// Use mutation observer approach to watch for canvas menu changes
		setTimeout(() => {
			this.setupCanvasMenuObservers();
		}, 1000);

		this.addSettingTab(new CanvasContextSettingTab(this.app, this));
	}

	override onunload() {
		this.hideLoadingStatus();
		// Clean up mutation observers
		this.observers.forEach((observer) => observer.disconnect());
		this.observers = [];
	}

	showLoadingStatus(text = "Loading...") {
		if (!this.statusEl) {
			return;
		}
		this.statusEl.empty();
		this.statusEl.createEl("span", { text, cls: "loading-text" });
		this.statusEl.createEl("span", { cls: "spinner" });
	}

	hideLoadingStatus() {
		this.statusEl?.empty();
	}

	async loadSettings() {
		this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
	}
	async saveSettings() {
		await this.saveData(this.settings);
		this.settingsEvents.trigger("settings-changed", this.settings);
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;

		const leaves = workspace.getLeavesOfType(VIEW_TYPE_CANVAS_CONTEXT);

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			if (leaves[0]) {
				leaf = leaves[0];
			}
		} else {
			// Our view could not be found in the workspace, create a new leaf
			// in the right sidebar for it
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				leaf = rightLeaf;
				await leaf.setViewState({
					type: VIEW_TYPE_CANVAS_CONTEXT,
					active: true,
				});
			}
		}

		// "Reveal" the leaf in case it is in a collapsed sidebar
		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	/**
	 * Called inside the NodeActions when the user selects "Run Inference" from the node right click menu
	 * Gathers context from connected nodes, sends to LLM, creates response node
	 *
	 */
	async runInference(nodeId: string, node: ExtendedCanvasConnection) {
		if (!node.canvas?.data) {
			// oxlint-disable-next-line no-new
			new Notice("No canvas data available on this node.");
			return;
		}
		let messages: ModelMessage[];
		try {
			messages = await canvasGraphWalker(nodeId, node.canvas.data, this.app);
		} catch (error) {
			console.error("Error in canvasGraphWalker:", error);
			// oxlint-disable-next-line no-new
			new Notice("Error processing canvas data. Check console for details.");
			return;
		}
		const currentModelConfig = this.settings.modelConfigurations.find(
			(config) => config.id === this.settings.currentModel && config.enabled,
		);
		if (!currentModelConfig?.provider) {
			// oxlint-disable-next-line no-new
			new Notice("Please select a valid model configuration in settings.");
			return;
		}
		this.showLoadingStatus("Running inference...");
		try {
			const resolvedApiKey = resolveApiKey(
				currentModelConfig,
				this.settings.apiKeys,
			);
			const result = await inference({
				messages,
				currentProviderName: currentModelConfig.provider,
				currentModelName: currentModelConfig.modelName,
				baseURL: currentModelConfig.baseURL,
				...(resolvedApiKey && { apiKey: resolvedApiKey }),
			});

			if (result.success) {
				this.createResponseNode(node, result.text, false);
				// oxlint-disable-next-line no-new
				new Notice("LLM response added to canvas.");
			} else {
				this.addRecentError(result);
				await this.createErrorNode(node, result);
				// oxlint-disable-next-line no-new
				new Notice(`Inference failed: ${result.error}`, 5000);
			}
		} catch (error) {
			console.error("Inference error:", error);
			// oxlint-disable-next-line no-new
			new Notice("Error during LLM inference. Check console for details.");
		} finally {
			this.hideLoadingStatus();
		}
	}
	createResponseNode(
		sourceNode: ExtendedCanvasConnection,
		response: string,
		isError: boolean = false,
	) {
		if (!sourceNode.canvas || !sourceNode.id) return;

		const canvas = sourceNode.canvas as any;
		const currentData = canvas.getData() as CanvasData;
		if (!currentData) return;

		const responseId = this.generateId(16);
		const sourceNodeData = currentData.nodes.find(
			(n: CanvasNodeData) => n.id === sourceNode.id,
		);

		const responseNodeData: CanvasTextData = {
			type: "text",
			text: `---\nrole: ${isError ? "error" : "assistant"}\n\n---\n\n${response}`,
			id: responseId,
			x: sourceNodeData?.x ?? 100,
			y: (sourceNodeData?.y ?? 50) + (sourceNodeData?.height ?? 50) + 50,
			width: 400,
			height: 200,
			color: isError ? "1" : "3",
		};

		const edgeData = {
			id: this.generateId(16),
			fromNode: sourceNode.id,
			toNode: responseId,
			fromSide: "bottom",
			toSide: "top",
		};

		canvas.importData({
			edges: [...currentData.edges, edgeData],
			nodes: [...currentData.nodes, responseNodeData],
		});
		canvas.requestFrame();
	}

	async createErrorNode(
		sourceNode: ExtendedCanvasConnection,
		result: InferenceResult,
	) {
		if (!sourceNode.canvas || !sourceNode.id || result.success) {
			return;
		}

		// Get current model configuration for context
		const currentModelConfig = this.settings.modelConfigurations.find(
			(config) => config.id === this.settings.currentModel,
		);

		// Create detailed error message with configuration context
		const errorDetails = [
			`# ❌ Inference Error`,
			``,
			`**Error Type:** ${result.errorType || "unknown"}`,
			`**Message:** ${result.error || "Unknown error occurred"}`,
			``,
			`## Configuration`,
			currentModelConfig
				? [
						`**Model:** ${currentModelConfig.name}`,
						`**Provider:** ${currentModelConfig.provider}`,
						`**Model Name:** ${currentModelConfig.modelName}`,
						`**Base URL:** ${currentModelConfig.baseURL}`,
					].join("\n")
				: "⚠️ No model configuration found",
			``,
			`## Troubleshooting`,
			this.getErrorTroubleshootingText(
				result.errorType,
				currentModelConfig?.provider,
			),
		].join("\n");

		// Use the existing createResponseNode method with error flag
		this.createResponseNode(sourceNode, errorDetails, true);
	}

	addRecentError(result: InferenceResult) {
		if (result.success) {
			return;
		}

		// Add timestamp to error
		const errorWithTimestamp = {
			...result,
			timestamp: Date.now(),
		};

		// Keep only the 5 most recent errors
		this.recentErrors.unshift(errorWithTimestamp as InferenceResult);
		if (this.recentErrors.length > 5) {
			this.recentErrors = this.recentErrors.slice(0, 5);
		}
	}

	getErrorTroubleshootingText(errorType?: string, provider?: string): string {
		const baseSteps: string[] = [];

		switch (errorType) {
			case "connection":
				baseSteps.push(
					"- Check if the provider service is running",
					"- Verify the base URL is correct",
					"- Ensure network connectivity",
				);
				break;
			case "model":
				baseSteps.push(
					"- Verify the model name exists on the provider",
					"- Check if the model is properly loaded",
					"- Try refreshing available models in the modal",
				);
				break;
			case "provider":
				baseSteps.push(
					"- Ensure the provider is properly configured",
					"- Check provider settings in the plugin",
				);
				break;
			default:
				baseSteps.push(
					"- Check the console for detailed error information",
					"- Verify all configuration settings",
					"- Try running inference again",
				);
		}

		// Add provider-specific guidance
		const providerSteps = this.getProviderSpecificSteps(provider);
		if (providerSteps.length > 0) {
			baseSteps.push("", "### Provider-Specific Tips:", ...providerSteps);
		}

		return baseSteps.join("\n");
	}

	getProviderSpecificSteps(provider?: string): string[] {
		switch (provider) {
			case "ollama":
				return [
					"**Ollama Setup:**",
					"- Default URL: `http://localhost:11434`",
					"- Start Ollama: `ollama serve`",
					"- List models: `ollama list`",
					"- Pull models: `ollama pull llama3.2`",
					"- Check status: visit http://localhost:11434 in browser",
				];
			case "lmstudio":
				return [
					"**LM Studio Setup:**",
					"- Default URL: `http://localhost:1234`",
					'- Enable "Start Server" in LM Studio',
					"- Load a model in the Local Server tab",
					"- Verify server is running in the Server tab",
					"- Check endpoint: visit http://localhost:1234/v1/models",
				];
			default:
				return [];
		}
	}

	async runInferenceFromSidebar(): Promise<boolean> {
		const canvasLeaves = this.app.workspace.getLeavesOfType("canvas");

		if (canvasLeaves.length === 0) {
			// oxlint-disable-next-line no-new
			new Notice("Please open a canvas to run inference.");
			return false;
		}

		const canvasLeaf = canvasLeaves[0];
		if (!canvasLeaf) {
			// oxlint-disable-next-line no-new
			new Notice("Canvas leaf not accessible.");
			return false;
		}

		const canvasView = canvasLeaf.view as any;
		const canvas = canvasView.canvas;

		if (!canvas) {
			// oxlint-disable-next-line no-new
			new Notice(
				"Canvas not accessible. Please ensure you have a canvas open.",
			);
			return false;
		}

		if (!canvas.selection) {
			// oxlint-disable-next-line no-new
			new Notice(
				"Canvas selection not available. Please ensure you have a canvas open.",
			);
			return false;
		}

		let selectionData, selectedNodes;
		try {
			selectionData = canvas.getSelectionData();
			selectedNodes = selectionData.nodes;
		} catch (error) {
			console.error("Error getting selection data:", error);
			// oxlint-disable-next-line no-new
			new Notice(
				"Error accessing canvas selection. Please try selecting a node again.",
			);
			return false;
		}

		if (selectedNodes.length === 0) {
			// oxlint-disable-next-line no-new
			new Notice("Please select a node in the canvas to run inference.");
			return false;
		}

		const selectedNodeData = selectedNodes[0];

		if (!selectedNodeData.id) {
			// oxlint-disable-next-line no-new
			new Notice("Selected node is not valid for inference.");
			return false;
		}

		const nodeConnection = {
			id: selectedNodeData.id,
			canvas: canvas,
		} as ExtendedCanvasConnection;

		try {
			await this.runInference(selectedNodeData.id, nodeConnection);
			return true;
		} catch (error) {
			console.error("Error running inference from sidebar:", error);
			// oxlint-disable-next-line no-new
			new Notice("Failed to run inference. Check console for details.");
			return false;
		}
	}

	buildSelectionMenu(menu: Menu, canvas: any) {
		try {
			const selectionData = canvas.getSelectionData();
			const selectedNodes = selectionData.nodes;

			// Only show the button if exactly one node is selected
			if (selectedNodes.length === 1) {
				menu.addItem((item) =>
					item
						.setTitle("Canvas Context: Run Inference")
						.setIcon(PLUGIN_ICON)
						.onClick(async () => {
							const selectedNode = selectedNodes[0];
							const nodeConnection = {
								id: selectedNode.id,
								canvas: canvas,
							} as ExtendedCanvasConnection;

							try {
								await this.runInference(selectedNode.id, nodeConnection);
							} catch (error) {
								console.error(
									"Error running inference from selection menu:",
									error,
								);
								// oxlint-disable-next-line no-new
								new Notice(
									"Failed to run inference. Check console for details.",
								);
							}
						}),
				);
			}
		} catch (error) {
			console.error("Error in buildSelectionMenu:", error);
		}
	}

	setupCanvasMenuObservers() {
		const canvasLeaves = this.app.workspace.getLeavesOfType("canvas");

		for (const leaf of canvasLeaves) {
			this.setupObserverForCanvas(leaf);
		}

		// Listen for new canvas views being created
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", (leaf) => {
				if (leaf?.view.getViewType() === "canvas") {
					setTimeout(() => {
						this.setupObserverForCanvas(leaf);
					}, 100);
				}
			}),
		);
	}

	setupObserverForCanvas(leaf: any) {
		const canvasView = leaf?.view as any;
		const canvas = canvasView?.canvas;

		if (!canvas || !canvas.menu || (canvas.menu as any)._observerSetup) {
			return;
		}

		(canvas.menu as any)._observerSetup = true;

		// Create mutation observer to watch for menu changes
		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (
					mutation.type === "childList" &&
					mutation.target === canvas.menu.menuEl
				) {
					this.addButtonToCanvasMenu(canvas);
				}
			});
		});

		// Start observing when menu element is available
		const checkMenuEl = () => {
			if (canvas.menu.menuEl) {
				observer.observe(canvas.menu.menuEl, {
					childList: true,
					subtree: false,
				});
				this.observers.push(observer);
			} else {
				setTimeout(checkMenuEl, 100);
			}
		};

		checkMenuEl();
	}

	addButtonToCanvasMenu(canvas: any) {
		try {
			if (!canvas.menu.menuEl) {
				return;
			}

			// Check if button already exists
			const existingButton = canvas.menu.menuEl.querySelector(
				".canvas-context-inference-btn",
			);
			if (existingButton) {
				return;
			}

			const selectionData = canvas.getSelectionData();

			// Only add button for single node selection
			if (selectionData?.nodes?.length === 1) {
				const button = document.createElement("button");
				button.className = "clickable-icon canvas-context-inference-btn";
				button.setAttribute("aria-label", "Canvas Context: Run Inference");
				button.setAttribute("data-tooltip-position", "top");
				setIcon(button, PLUGIN_ICON);

				button.addEventListener("click", async (e) => {
					e.stopPropagation();
					e.preventDefault();

					try {
						const currentSelection = canvas.getSelectionData();
						if (currentSelection?.nodes?.length > 0) {
							const firstNode = currentSelection.nodes[0];
							await this.runInference(firstNode.id, {
								id: firstNode.id,
								canvas,
							} as any);
						}
					} catch (error) {
						console.error("Inference error:", error);
					}
				});

				canvas.menu.menuEl.appendChild(button);
			}
		} catch (error) {
			console.error("Error adding button to canvas menu:", error);
		}
	}

	getCurrentCanvas(): any | null {
		const canvasView = this.app.workspace.getActiveViewOfType(ItemView);
		if (canvasView?.getViewType() !== "canvas") {
			return null;
		}
		return (canvasView as any)?.canvas || null;
	}

	generateId(length: number = 16): string {
		let result: string[] = [];
		for (let i = 0; i < length; i++) {
			result.push(((16 * Math.random()) | 0).toString(16));
		}
		return result.join("");
	}
}
