import { Plugin, Menu, WorkspaceLeaf } from "obsidian";
import NodeActions from "./canvas/nodes-actions.ts";
import type { CanvasConnection } from "obsidian-typings";
import { CanvasContextSettingTab } from "./ui/settings.ts";
import { CanvasContextView, VIEW_TYPE_CANVAS_CONTEXT } from "./ui/view.tsx";

interface CanvasContextSettings {
	settings: string;
}

const DEFAULT_SETTINGS: CanvasContextSettings = {
	settings: "default",
};

export default class CanvasContextPlugin extends Plugin {
	nodeActions: NodeActions | undefined;
	statusEl: HTMLElement | null = null;

	settings: CanvasContextSettings = DEFAULT_SETTINGS;
	async onload() {
		await this.loadSettings();
		this.registerView(
			VIEW_TYPE_CANVAS_CONTEXT,
			(leaf) => new CanvasContextView(leaf),
		);

		this.addRibbonIcon("dice", "Activate view", () => {
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
}
