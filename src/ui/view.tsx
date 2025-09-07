import { ItemView, WorkspaceLeaf } from "obsidian";
import { StrictMode } from "react";
import { type Root, createRoot } from "react-dom/client";
import { ReactView } from "./components/react-view.tsx";
import { Layout } from "./layout.tsx";

export const VIEW_TYPE_CANVAS_CONTEXT = "canvas-context-view";

export class CanvasContextView extends ItemView {
	root: Root | null = null;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() {
		return VIEW_TYPE_CANVAS_CONTEXT;
	}

	getDisplayText() {
		return "Example view";
	}

	async onOpen() {
		this.root = createRoot(this.contentEl);
		this.root.render(
			<StrictMode>
				<Layout>
					<ReactView />
				</Layout>
			</StrictMode>,
		);

		// const container = this.contentEl;
		// container.empty();
		// container.createEl("h1", { text: "Canvas Context" });
		// container.createEl("p", { text: "This is an example view." });
		// I want to have here some options and infos.
		// basic infos
		// the current estimated token count
		// the current provider
		//  which model is used
		// we should be able to switch the model and the provider here
		// Each provider will have some specific view if needed
		// first will be LM Studio and ollama with a dropdown
		// then the model selection
		// we need to be able to refresh the available models
		// - which options do we surface
		// - temperature
		// - max tokens
	}

	async onClose() {
		this.root?.unmount();
	}
}
