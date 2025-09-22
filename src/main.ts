/* oxlint-disable eslint/max-lines */
import { Events, Menu, Plugin, WorkspaceLeaf } from "obsidian";

import type {
	CanvasConnection,
	CanvasView,
	CanvasViewCanvas,
} from "obsidian-typings";
import NodeActions from "./canvas/nodes-actions.ts";
import {
	PLUGIN_DISPLAY_NAME,
	PLUGIN_ICON,
	VIEW_TYPE_CANVAS_CONTEXT,
} from "./lib/constants.ts";
import { InferenceService } from "./services/inference-service.ts";
import { CanvasService } from "./services/canvas-service.ts";
import { MenuService } from "./services/menu-service.ts";
import { StatusService } from "./services/status-service.ts";
import { ObsidianNotificationAdapter } from "./adapters/obsidian-ui-notifications.ts";
import type {
	ExtendedCanvasConnection,
	InferenceContext,
} from "./types/canvas-types.ts";
import { CanvasContextSettingTab, DEFAULT_SETTINGS } from "./ui/settings.ts";
import { CanvasContextView } from "./ui/view.tsx";
import type { InferenceResult, RecentError } from "./types/inference-types.ts";
import type { CanvasContextSettings } from "./types/settings-types.ts";

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
	settings: CanvasContextSettings = DEFAULT_SETTINGS;
	settingsEvents: Events = new Events();
	private activeInferences = new Map<string, InferenceContext>();
	private inferenceService!: InferenceService;
	private canvasService!: CanvasService;
	private menuService!: MenuService;
	private statusService!: StatusService;
	private notificationAdapter!: ObsidianNotificationAdapter;

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

		// Initialize adapters and services
		this.notificationAdapter = new ObsidianNotificationAdapter();

		this.canvasService = new CanvasService(this.app);
		this.statusService = new StatusService(this.addStatusBarItem());
		this.inferenceService = new InferenceService(
			this.app,
			() => this.settings,
			(text) => this.statusService.showLoadingStatus(text),
			() => this.statusService.hideLoadingStatus(),
		);
		this.menuService = new MenuService(
			(nodeId, canvas) => this.runInference(nodeId, canvas),
			this.notificationAdapter,
		);
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
					this.menuService.buildSelectionMenu(menu, canvas);
				},
			),
		);

		// Use mutation observer approach to watch for canvas menu changes
		setTimeout(() => {
			this.menuService.setupCanvasMenuObservers(
				() => this.app.workspace.getLeavesOfType("canvas"),
				(callback) =>
					this.registerEvent(
						this.app.workspace.on("active-leaf-change", callback),
					),
			);
		}, 1000);

		this.addSettingTab(new CanvasContextSettingTab(this.app, this));
	}

	override onunload() {
		this.statusService.hideLoadingStatus();
		this.menuService.cleanup();
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
		const canvasInfo = this.canvasService.getCanvasInfo(
			canvas ? ({ canvas } as ExtendedCanvasConnection) : undefined,
		);

		if (!canvasInfo) {
			this.notificationAdapter.showError("No canvas available for inference.");
			return;
		}

		if (!canvasInfo.canvas?.data) {
			this.notificationAdapter.showError("No canvas data available.");
			return;
		}

		// Capture inference context immediately
		let inferenceContext: InferenceContext;
		try {
			inferenceContext = this.canvasService.captureInferenceContext(
				canvasInfo.name,
				nodeId,
				canvasInfo.canvas,
				(length) => this.generateId(length),
			);
		} catch (error) {
			console.error("Error capturing inference context:", error);
			this.notificationAdapter.showError(
				"Error setting up inference context. Check console for details.",
			);
			return;
		}

		this.activeInferences.set(inferenceContext.id, inferenceContext);

		try {
			const result = await this.inferenceService.runInference(
				nodeId,
				canvasInfo.canvas.data,
			);

			if (result.success) {
				await this.canvasService.createResponseNodeWithContext(
					inferenceContext,
					result.text,
					false,
					(length) => this.generateId(length),
				);
				this.notificationAdapter.showSuccess(
					`LLM response added to "${inferenceContext.canvasFileName}".`,
				);
			} else {
				this.inferenceService.addRecentError(result);
				await this.createErrorNodeWithContext(inferenceContext, result);
				this.notificationAdapter.showError(`Inference failed: ${result.error}`);
			}
		} catch (error) {
			console.error("Inference error:", error);
			this.notificationAdapter.showError(
				"Error during LLM inference. Check console for details.",
			);
		} finally {
			// Clean up context
			this.activeInferences.delete(inferenceContext.id);
		}
	}
	createResponseNode(
		sourceNode: ExtendedCanvasConnection,
		response: string,
		isError: boolean = false,
	) {
		this.canvasService.createResponseNode(
			sourceNode,
			response,
			isError,
			(length) => this.generateId(length),
		);
	}

	createErrorNode(
		sourceNode: ExtendedCanvasConnection,
		result: InferenceResult,
	) {
		if (!sourceNode.canvas || !sourceNode.id || result.success) {
			return;
		}

		const errorDetails = this.inferenceService.createErrorDetails(result);
		this.createResponseNode(sourceNode, errorDetails, true);
	}

	addRecentError(result: InferenceResult) {
		this.inferenceService.addRecentError(result);
	}

	getErrorTroubleshootingText(errorType?: string, provider?: string): string {
		return this.inferenceService.getErrorTroubleshootingText(
			errorType,
			provider,
		);
	}

	getRecentErrors(): RecentError[] {
		return this.inferenceService.getRecentErrors();
	}
	//oxlint-disable-next-line eslint/max-lines-per-function
	async runInferenceFromSidebar(): Promise<boolean> {
		// For sidebar inference, we need to find a canvas with selection
		const canvasLeaves = this.app.workspace.getLeavesOfType("canvas");

		if (canvasLeaves.length === 0) {
			this.notificationAdapter.showInfo(
				"Please open a canvas to run inference.",
			);
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
					// Log error but continue to next canvas
					console.warn(
						"Failed to get selection data from canvas:",
						view.file?.name,
						error,
					);
					continue;
				}
			}
		}

		if (!canvasInfo) {
			this.notificationAdapter.showInfo(
				"Please select a node in a canvas to run inference.",
			);
			return false;
		}

		if (!canvasInfo.canvas.selection) {
			this.notificationAdapter.showInfo(
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
			this.notificationAdapter.showError(
				"Error accessing canvas selection. Please try selecting a node again.",
			);
			return false;
		}

		if (selectedNodes.length === 0) {
			this.notificationAdapter.showInfo(
				"Please select a node in the canvas to run inference.",
			);
			return false;
		}

		const selectedNodeData = selectedNodes[0];
		if (!selectedNodeData || !selectedNodeData.id) {
			this.notificationAdapter.showError(
				"Selected node is not valid for inference.",
			);
			return false;
		}

		try {
			await this.runInference(selectedNodeData.id as string, canvasInfo.canvas);
			return true;
		} catch (error) {
			console.error("Error running inference from sidebar:", error);
			this.notificationAdapter.showError(
				"Failed to run inference. Check console for details.",
			);
			return false;
		}
	}

	generateId(length: number = 16): string {
		let result: string[] = [];
		for (let i = 0; i < length; i++) {
			result.push(((16 * Math.random()) | 0).toString(16));
		}
		return result.join("");
	}

	private async createErrorNodeWithContext(
		context: InferenceContext,
		result: InferenceResult,
	) {
		if (result.success) {
			return;
		}

		const errorDetails = this.inferenceService.createErrorDetails(result);
		await this.canvasService.createResponseNodeWithContext(
			context,
			errorDetails,
			true,
			(length) => this.generateId(length),
		);
	}
}
