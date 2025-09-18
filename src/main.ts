import {
	Events,
	Menu,
	Notice,
	Plugin,
	TextFileView,
	WorkspaceLeaf,
	setIcon,
} from "obsidian";

import type { ModelMessage } from "ai";
import type {
	CanvasConnection,
	CanvasView,
	CanvasViewCanvas,
	CanvasMenu,
} from "obsidian-typings";
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
	InferenceContext,
} from "./types/canvas-types.ts";
import {
	CanvasContextSettingTab,
	type CanvasContextSettings,
	DEFAULT_SETTINGS,
} from "./ui/settings.ts";
import { CanvasContextView } from "./ui/view.tsx";

interface ExtendedCanvasMenu extends CanvasMenu {
	_observerSetup?: boolean;
}

interface ExtendedCanvasViewCanvas extends CanvasViewCanvas {
	menu: ExtendedCanvasMenu;
}

interface SelectionData {
	nodes: Array<{ id: string; [key: string]: unknown }>;
}

export function isSelectionData(data: unknown): data is SelectionData {
	return (
		typeof data === "object" &&
		data !== null &&
		"nodes" in data &&
		Array.isArray((data as Record<string, unknown>).nodes)
	);
}

export default class CanvasContextPlugin extends Plugin {
	nodeActions: NodeActions | undefined;
	statusEl: HTMLElement | null = null;
	recentErrors: InferenceResult[] = [];
	settings: CanvasContextSettings = DEFAULT_SETTINGS;
	settingsEvents: Events = new Events();
	private observers: MutationObserver[] = [];
	private activeInferences = new Map<string, InferenceContext>();

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
				(menu: Menu, canvas: CanvasView) => {
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
	async runInference(nodeId: string, canvas?: CanvasViewCanvas) {
		const canvasInfo = this.getCanvasInfo(
			canvas ? ({ canvas } as ExtendedCanvasConnection) : undefined,
		);

		if (!canvasInfo) {
			// oxlint-disable-next-line no-new
			new Notice("No canvas available for inference.");
			return;
		}

		if (!canvasInfo.canvas?.data) {
			// oxlint-disable-next-line no-new
			new Notice("No canvas data available.");
			return;
		}

		// Capture inference context immediately
		let inferenceContext: InferenceContext;
		try {
			inferenceContext = this.captureInferenceContext(
				canvasInfo.name,
				nodeId,
				canvasInfo.canvas,
			);
		} catch (error) {
			console.error("Error capturing inference context:", error);
			// oxlint-disable-next-line no-new
			new Notice(
				"Error setting up inference context. Check console for details.",
			);
			return;
		}

		let messages: ModelMessage[];
		try {
			messages = await canvasGraphWalker(
				nodeId,
				canvasInfo.canvas.data,
				this.app,
			);
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
				await this.createResponseNodeWithContext(
					inferenceContext,
					result.text,
					false,
				);
				// oxlint-disable-next-line no-new
				new Notice(
					`LLM response added to "${inferenceContext.canvasFileName}".`,
				);
			} else {
				this.addRecentError(result);
				await this.createErrorNodeWithContext(inferenceContext, result);
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

		const canvas = sourceNode.canvas;
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

		canvas.importData(
			{
				edges: [...currentData.edges, edgeData],
				nodes: [...currentData.nodes, responseNodeData],
			},
			undefined,
		);
		canvas.requestFrame(undefined);
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
		// For sidebar inference, we need to find a canvas with selection
		const canvasLeaves = this.app.workspace.getLeavesOfType("canvas");

		if (canvasLeaves.length === 0) {
			// oxlint-disable-next-line no-new
			new Notice("Please open a canvas to run inference.");
			return false;
		}

		// Find a canvas with selection
		let canvasInfo: { canvas: CanvasViewCanvas; name: string } | null = null;
		for (const leaf of canvasLeaves) {
			const view = leaf.view as CanvasView;
			if (view.canvas && view.file?.name) {
				try {
					const selectionData = view.canvas.getSelectionData(undefined);
					if (
						isSelectionData(selectionData) &&
						selectionData.nodes.length > 0
					) {
						canvasInfo = { canvas: view.canvas, name: view.file.name };
						break;
					}
				} catch (error) {
					// Continue to next canvas
					continue;
				}
			}
		}

		if (!canvasInfo) {
			// oxlint-disable-next-line no-new
			new Notice("Please select a node in a canvas to run inference.");
			return false;
		}

		if (!canvasInfo.canvas.selection) {
			// oxlint-disable-next-line no-new
			new Notice(
				"Canvas selection not available. Please ensure you have a canvas open.",
			);
			return false;
		}

		let selectedNodes: Array<{ id: string; [key: string]: unknown }>;
		try {
			const selectionData = canvasInfo.canvas.getSelectionData(undefined);
			if (!isSelectionData(selectionData)) {
				throw new Error("Invalid selection data format");
			}
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
		if (!selectedNodeData || !selectedNodeData.id) {
			// oxlint-disable-next-line no-new
			new Notice("Selected node is not valid for inference.");
			return false;
		}

		try {
			await this.runInference(selectedNodeData.id as string, canvasInfo.canvas);
			return true;
		} catch (error) {
			console.error("Error running inference from sidebar:", error);
			// oxlint-disable-next-line no-new
			new Notice("Failed to run inference. Check console for details.");
			return false;
		}
	}

	buildSelectionMenu(menu: Menu, canvasView: CanvasView) {
		try {
			const selectionData = canvasView.canvas.getSelectionData(undefined);
			if (!isSelectionData(selectionData)) {
				return;
			}
			const selectedNodes = selectionData.nodes;

			// Only show the button if exactly one node is selected
			if (selectedNodes.length === 1) {
				menu.addItem((item) =>
					item
						.setTitle("Canvas Context: Run Inference")
						.setIcon(PLUGIN_ICON)
						.onClick(async () => {
							const selectedNode = selectedNodes[0];
							if (!selectedNode || !selectedNode.id) {
								return;
							}

							try {
								await this.runInference(
									selectedNode.id as string,
									canvasView.canvas,
								);
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

	setupObserverForCanvas(leaf: WorkspaceLeaf) {
		const canvasView = leaf?.view as CanvasView;
		const canvas = canvasView?.canvas;

		const extendedCanvas = canvas as ExtendedCanvasViewCanvas;
		if (
			!extendedCanvas ||
			!extendedCanvas.menu ||
			extendedCanvas.menu._observerSetup
		) {
			return;
		}

		extendedCanvas.menu._observerSetup = true;

		// Create mutation observer to watch for menu changes
		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (
					mutation.type === "childList" &&
					mutation.target === extendedCanvas.menu.menuEl
				) {
					this.addButtonToCanvasMenu(canvasView);
				}
			});
		});

		// Start observing when menu element is available
		const checkMenuEl = () => {
			if (extendedCanvas.menu.menuEl) {
				observer.observe(extendedCanvas.menu.menuEl, {
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

	addButtonToCanvasMenu(canvasView: CanvasView) {
		try {
			const extendedCanvas = canvasView.canvas as ExtendedCanvasViewCanvas;
			if (!extendedCanvas.menu.menuEl) {
				return;
			}

			// Check if button already exists
			const existingButton = extendedCanvas.menu.menuEl.querySelector(
				".canvas-context-inference-btn",
			);
			if (existingButton) {
				return;
			}

			const selectionData = canvasView.canvas.getSelectionData(undefined);

			// Only add button for single node selection
			if (isSelectionData(selectionData) && selectionData.nodes.length === 1) {
				const button = document.createElement("button");
				button.className = "clickable-icon canvas-context-inference-btn";
				button.setAttribute("aria-label", "Canvas Context: Run Inference");
				button.setAttribute("data-tooltip-position", "top");
				setIcon(button, PLUGIN_ICON);

				button.addEventListener("click", async (e) => {
					e.stopPropagation();
					e.preventDefault();

					try {
						const currentSelection =
							canvasView.canvas.getSelectionData(undefined);
						if (
							isSelectionData(currentSelection) &&
							currentSelection.nodes.length > 0
						) {
							const firstNode = currentSelection.nodes[0];
							if (firstNode && typeof firstNode.id === "string") {
								await this.runInference(firstNode.id, canvasView.canvas);
							}
						}
					} catch (error) {
						console.error("Inference error:", error);
					}
				});

				extendedCanvas.menu.menuEl.appendChild(button);
			}
		} catch (error) {
			console.error("Error adding button to canvas menu:", error);
		}
	}

	getCanvasInfo(
		node?: ExtendedCanvasConnection,
	): { canvas: CanvasViewCanvas; name: string } | null {
		// If node provided with canvas reference, use that canvas
		if (node?.canvas) {
			const canvasLeaves = this.app.workspace.getLeavesOfType("canvas");
			for (const leaf of canvasLeaves) {
				const view = leaf.view as CanvasView;
				if (view?.canvas === node.canvas && view?.file?.name) {
					return { canvas: node.canvas, name: view.file.name };
				}
			}
			// If we have a canvas but can't find the name, return with fallback name
			return { canvas: node.canvas, name: "canvas" };
		}

		// Otherwise, get active canvas
		const activeView = this.app.workspace.getActiveViewOfType(TextFileView);

		// First try: Active view is a canvas (normal case)
		if (activeView?.file?.extension === "canvas") {
			const canvasView = activeView as CanvasView;
			if (canvasView.canvas && canvasView.file) {
				return {
					canvas: canvasView.canvas,
					name: canvasView.file.name || "canvas",
				};
			}
		}

		// No fallback - we need explicit canvas context for sidebar inference
		return null;
	}

	generateId(length: number = 16): string {
		let result: string[] = [];
		for (let i = 0; i < length; i++) {
			result.push(((16 * Math.random()) | 0).toString(16));
		}
		return result.join("");
	}

	private findCanvasLeaf(canvasFileName: string): WorkspaceLeaf | null {
		const canvasLeaves = this.app.workspace.getLeavesOfType("canvas");

		const targetLeaf = canvasLeaves.find((leaf) => {
			const view = leaf.view as CanvasView;
			const fileName = view.file?.name;
			const filePath = view.file?.path;

			// Try multiple matching strategies
			return (
				fileName === canvasFileName ||
				filePath === canvasFileName ||
				fileName === canvasFileName.replace(".canvas", "") ||
				filePath?.endsWith(canvasFileName)
			);
		});

		return targetLeaf || null;
	}

	private captureInferenceContext(
		canvasFileName: string,
		nodeId: string,
		canvas: CanvasViewCanvas,
	): InferenceContext {
		const canvasData = canvas.getData() as CanvasData;
		if (!canvasData) {
			throw new Error(`No canvas data available for ${canvasFileName}`);
		}

		const sourceNode = canvasData.nodes.find((n) => n.id === nodeId);

		if (!sourceNode) {
			throw new Error(
				`Source node ${nodeId} not found in canvas ${canvasFileName}`,
			);
		}

		const context: InferenceContext = {
			id: this.generateId(),
			canvasFileName,
			sourceNodeId: nodeId,
			sourceNodePosition: {
				x: sourceNode.x,
				y: sourceNode.y,
				width: sourceNode.width,
				height: sourceNode.height,
			},
			timestamp: Date.now(),
		};

		this.activeInferences.set(context.id, context);
		return context;
	}

	private async createResponseNodeWithContext(
		context: InferenceContext,
		response: string,
		isError: boolean = false,
	) {
		// First try: Find in currently loaded canvas leaves
		let targetLeaf = this.findCanvasLeaf(context.canvasFileName);

		// Second try: If not loaded, try to open the canvas file
		if (!targetLeaf) {
			// Find the canvas file in the vault
			const canvasFile = this.app.vault.getAbstractFileByPath(
				context.canvasFileName,
			);
			if (canvasFile && canvasFile.path.endsWith(".canvas")) {
				try {
					// Open the canvas file
					const leaf = await this.app.workspace.openLinkText(
						context.canvasFileName,
						"",
						true,
					);
					if (leaf && leaf.view.getViewType() === "canvas") {
						targetLeaf = leaf;
					}
				} catch (error) {
					console.error("Failed to open canvas file:", error);
				}
			}
		}

		// Third try: Check again after potential opening
		if (!targetLeaf) {
			targetLeaf = this.findCanvasLeaf(context.canvasFileName);
		}

		if (!targetLeaf) {
			// oxlint-disable-next-line no-new
			new Notice(
				`Canvas "${context.canvasFileName}" could not be opened for response placement`,
			);
			return;
		}

		const canvasView = targetLeaf.view as CanvasView;
		const canvas = canvasView.canvas;

		if (!canvas) {
			return;
		}

		const currentData = canvas.getData() as CanvasData;
		if (!currentData) {
			return;
		}

		const responseId = this.generateId(16);

		// Use the captured position from context
		const responseNodeData: CanvasTextData = {
			type: "text",
			text: `---\nrole: ${isError ? "error" : "assistant"}\n\n---\n\n${response}`,
			id: responseId,
			x: context.sourceNodePosition.x,
			y: context.sourceNodePosition.y + context.sourceNodePosition.height + 50,
			width: 400,
			height: 200,
			color: isError ? "1" : "3",
		};

		const edgeData = {
			id: this.generateId(16),
			fromNode: context.sourceNodeId,
			toNode: responseId,
			fromSide: "bottom",
			toSide: "top",
		};

		canvas.importData(
			{
				edges: [...currentData.edges, edgeData],
				nodes: [...currentData.nodes, responseNodeData],
			},
			undefined,
		);
		canvas.requestFrame(undefined);

		// Force save to persist changes to disk
		try {
			if (canvasView.file) {
				await this.app.vault.modify(
					canvasView.file,
					JSON.stringify(canvas.getData()),
				);
			}
		} catch (error) {
			console.error("Failed to save canvas:", error);
			// oxlint-disable-next-line no-new
			new Notice(
				"Response added but canvas save failed. Please save manually.",
			);
		}

		// Clean up context
		this.activeInferences.delete(context.id);
	}

	private async createErrorNodeWithContext(
		context: InferenceContext,
		result: InferenceResult,
	) {
		if (result.success) {
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

		// Use the context-based createResponseNode method with error flag
		await this.createResponseNodeWithContext(context, errorDetails, true);
	}
}
