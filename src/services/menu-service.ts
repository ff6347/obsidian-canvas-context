import { Menu, WorkspaceLeaf, setIcon } from "obsidian";
import type { CanvasView, CanvasViewCanvas } from "obsidian-typings";

import { PLUGIN_ICON } from "../lib/constants.ts";
import { isSelectionData } from "../main.ts";
import {
	shouldShowInferenceButton,
	getFirstNodeId,
	createButtonConfig,
	shouldSetupObserver,
} from "../lib/menu-logic.ts";
import type { UINotificationAdapter } from "../types/adapter-types.ts";

interface ExtendedCanvasMenu {
	menuEl?: HTMLElement;
	_observerSetup?: boolean;
}

interface ExtendedCanvasViewCanvas {
	menu: ExtendedCanvasMenu;
}

export class MenuService {
	private observers: MutationObserver[] = [];

	constructor(
		private onRunInference: (
			nodeId: string,
			canvas?: CanvasViewCanvas,
		) => Promise<void>,
		private notificationAdapter?: UINotificationAdapter,
	) {}

	buildSelectionMenu(menu: Menu, canvasView: CanvasView) {
		try {
			const selectionData = canvasView.canvas.getSelectionData(undefined);
			if (!isSelectionData(selectionData)) {
				return;
			}
			const selectedNodes = selectionData.nodes;

			// Only show the button if exactly one node is selected
			if (shouldShowInferenceButton(selectedNodes.length)) {
				menu.addItem((item) =>
					item
						.setTitle("Canvas Context: Run Inference")
						.setIcon(PLUGIN_ICON)
						.onClick(async () => {
							const nodeId = getFirstNodeId(selectedNodes);
							if (!nodeId) {
								return;
							}

							try {
								await this.onRunInference(nodeId, canvasView.canvas);
							} catch (error) {
								console.error(
									"Error running inference from selection menu:",
									error,
								);
								this.notificationAdapter?.showError(
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

	setupCanvasMenuObservers(
		getCanvasLeaves: () => WorkspaceLeaf[],
		onActiveLeafChange: (
			callback: (leaf: WorkspaceLeaf | null) => void,
		) => void,
	) {
		const canvasLeaves = getCanvasLeaves();

		for (const leaf of canvasLeaves) {
			this.setupObserverForCanvas(leaf);
		}

		// Listen for new canvas views being created
		onActiveLeafChange((leaf) => {
			if (leaf?.view.getViewType() === "canvas") {
				setTimeout(() => {
					this.setupObserverForCanvas(leaf);
				}, 100);
			}
		});
	}

	setupObserverForCanvas(leaf: WorkspaceLeaf) {
		const canvasView = leaf?.view as CanvasView;
		const canvas = canvasView?.canvas;

		const extendedCanvas = canvas as ExtendedCanvasViewCanvas;
		if (!shouldSetupObserver(extendedCanvas)) {
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
			if (
				isSelectionData(selectionData) &&
				shouldShowInferenceButton(selectionData.nodes.length)
			) {
				const buttonConfig = createButtonConfig();
				const button = document.createElement("button");
				button.className = buttonConfig.className;
				button.setAttribute("aria-label", buttonConfig.ariaLabel);
				button.setAttribute(
					"data-tooltip-position",
					buttonConfig.dataTooltipPosition,
				);
				setIcon(button, PLUGIN_ICON);

				button.addEventListener("click", async (e) => {
					e.stopPropagation();
					e.preventDefault();

					try {
						const currentSelection =
							canvasView.canvas.getSelectionData(undefined);
						if (isSelectionData(currentSelection)) {
							const nodeId = getFirstNodeId(currentSelection.nodes);
							if (nodeId) {
								await this.onRunInference(nodeId, canvasView.canvas);
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

	cleanup() {
		// Clean up mutation observers
		this.observers.forEach((observer) => observer.disconnect());
		this.observers = [];
	}
}
