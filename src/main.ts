import { Plugin, Menu, WorkspaceLeaf, ItemView, setIcon } from "obsidian";
import NodeActions from "./canvas/nodes-actions.ts";
import type { CanvasConnection } from "obsidian-typings";
import {
	type CanvasContextSettings,
	CanvasContextSettingTab,
	DEFAULT_SETTINGS,
	resolveApiKey,
} from "./ui/settings.ts";
import { CanvasContextView } from "./ui/view.tsx";
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
import {
	PLUGIN_DISPLAY_NAME,
	PLUGIN_ICON,
	VIEW_TYPE_CANVAS_CONTEXT,
} from "./lib/constants.ts";

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

	onunload() {
		this.hideLoadingStatus();
		// Clean up mutation observers
		this.observers.forEach((observer) => observer.disconnect());
		this.observers = [];
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
				this.showLoadingStatus("Running inference...");

				const currentModelConfig = this.settings.modelConfigurations.find(
					(config) =>
						config.id === this.settings.currentModel && config.enabled,
				);

				if (!currentModelConfig || !currentModelConfig.provider) {
					new Notice("Please select a valid model configuration in settings.");
					this.hideLoadingStatus();
					return;
				}

				const inferenceOptions = {
					messages,
					currentProviderName: currentModelConfig.provider,
					currentModelName: currentModelConfig.modelName,
					baseURL: currentModelConfig.baseURL,
				};

				// Resolve API key from centralized store or fall back to legacy
				const resolvedApiKey = resolveApiKey(
					currentModelConfig,
					this.settings.apiKeys,
				);
				if (resolvedApiKey) {
					(inferenceOptions as any).apiKey = resolvedApiKey;
				}

				const result = await inference(inferenceOptions);

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
		await this.createResponseNode(sourceNode, errorDetails, true);
	}

	addRecentError(result: InferenceResult) {
		if (result.success) return;

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
			new Notice("Please open a canvas to run inference.");
			return false;
		}

		const canvasLeaf = canvasLeaves[0];
		if (!canvasLeaf) {
			new Notice("Canvas leaf not accessible.");
			return false;
		}

		const canvasView = canvasLeaf.view as any;
		const canvas = canvasView.canvas;

		if (!canvas) {
			new Notice(
				"Canvas not accessible. Please ensure you have a canvas open.",
			);
			return false;
		}

		if (!canvas.selection) {
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
			new Notice(
				"Error accessing canvas selection. Please try selecting a node again.",
			);
			return false;
		}

		if (selectedNodes.length === 0) {
			new Notice("Please select a node in the canvas to run inference.");
			return false;
		}

		const selectedNodeData = selectedNodes[0];

		if (!selectedNodeData.id) {
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

	patchCanvasMenusProperlyThisTime() {
		console.log("🎯 Patching canvas menus properly...");
		const canvasLeaves = this.app.workspace.getLeavesOfType("canvas");
		console.log("🎯 Found canvas leaves:", canvasLeaves.length);

		for (const leaf of canvasLeaves) {
			const canvasView = leaf.view as any;
			const canvas = canvasView?.canvas;

			if (
				!canvas ||
				!canvas.menu ||
				(canvas.menu as any)._contextPatchedProperly
			) {
				continue;
			}

			console.log("🎯 Patching canvas menu properly");
			(canvas.menu as any)._contextPatchedProperly = true;

			const self = this;
			const originalRender = canvas.menu.render;

			// Store reference to original render
			(canvas.menu as any)._originalRender = originalRender;

			canvas.menu.render = function () {
				// Call original render first
				const result = originalRender.call(this);

				// Now augment with our button
				setTimeout(() => {
					try {
						if (!this.menuEl) {
							console.log("🎯 No menuEl available");
							return;
						}

						// Check if we already added our button
						if (this.menuEl.querySelector(".canvas-context-inference-btn")) {
							console.log("🎯 Button already exists, skipping");
							return;
						}

						const selectionData = canvas.getSelectionData();
						console.log("🎯 Menu render - selection data:", selectionData);
						console.log(
							"🎯 Menu element children before adding button:",
							this.menuEl.children.length,
							Array.from(this.menuEl.children),
						);

						// Only add for single selection
						if (selectionData.nodes.length === 1) {
							console.log("🎯 Adding button via menu patching");

							const button = document.createElement("button");
							button.className = "clickable-icon canvas-context-inference-btn";
							button.setAttribute(
								"aria-label",
								"Canvas Context: Run Inference",
							);
							button.setAttribute("data-tooltip-position", "top");
							setIcon(button, "zap");

							button.addEventListener("click", async (e) => {
								e.stopPropagation();
								e.preventDefault();

								try {
									const currentSelection = canvas.getSelectionData();
									if (currentSelection.nodes.length > 0) {
										const firstNode = currentSelection.nodes[0];
										await self.runInference(firstNode.id, {
											id: firstNode.id,
											canvas,
										} as any);
									}
								} catch (error) {
									console.error("🎯 Inference error:", error);
								}
							});

							// Insert at the beginning instead of appending to preserve existing buttons
							this.menuEl.insertBefore(button, this.menuEl.firstChild);
							console.log("🎯 Button added successfully");
							console.log(
								"🎯 Menu element children after adding button:",
								this.menuEl.children.length,
								Array.from(this.menuEl.children),
							);
						} else {
							console.log(
								"🎯 Not single selection, not adding button. Count:",
								selectionData.nodes.length,
							);
						}
					} catch (error) {
						console.error("🎯 Error adding button:", error);
					}
				}, 10);

				return result;
			};
		}
	}

	private observers: MutationObserver[] = [];

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

		const self = this;

		// Create mutation observer to watch for menu changes
		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				if (
					mutation.type === "childList" &&
					mutation.target === canvas.menu.menuEl
				) {
					self.addButtonToCanvasMenu(canvas);
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
			if (!canvas.menu.menuEl) return;

			// Check if button already exists
			const existingButton = canvas.menu.menuEl.querySelector(
				".canvas-context-inference-btn",
			);
			if (existingButton) return;

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
		if (canvasView?.getViewType() !== "canvas") return null;
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
