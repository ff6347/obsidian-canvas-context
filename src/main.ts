import { Plugin, Menu } from "obsidian";
import NodeActions from "./canvas/nodes-actions.js";
import type { CanvasConnection } from "obsidian-typings";

export default class CanvasContextPlugin extends Plugin {
	nodeActions: NodeActions | undefined;
	async onload() {
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
	}
	onunload() {}
}
