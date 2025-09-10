import { ItemView, WorkspaceLeaf } from "obsidian";
import { StrictMode } from "react";
import { type Root, createRoot } from "react-dom/client";
import { Layout } from "./layout.tsx";
import type CanvasContextPlugin from "../main.ts";
import {
	PLUGIN_DISPLAY_NAME,
	PLUGIN_ICON,
	VIEW_TYPE_CANVAS_CONTEXT,
} from "../lib/constants.ts";
import { ReactView } from "./components/react-view.tsx";
import { SettingsProvider } from "../contexts/settings-context.tsx";

export class CanvasContextView extends ItemView {
	root: Root | null = null;
	plugin: CanvasContextPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: CanvasContextPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return VIEW_TYPE_CANVAS_CONTEXT;
	}

	getDisplayText() {
		return PLUGIN_DISPLAY_NAME;
	}

	getIcon() {
		return PLUGIN_ICON;
	}

	async onOpen() {
		this.root = createRoot(this.contentEl);
		this.root.render(
			<StrictMode>
				<SettingsProvider plugin={this.plugin}>
					<Layout>
						<ReactView plugin={this.plugin} />
					</Layout>
				</SettingsProvider>
			</StrictMode>,
		);
	}

	async onClose() {
		this.root?.unmount();
	}
}
