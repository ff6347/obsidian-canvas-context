import { App, TextFileView } from "obsidian";
import type { CanvasView, CanvasViewCanvas } from "obsidian-typings";
import type {
	CanvasOperationAdapter,
	CanvasInfo,
	ExtendedCanvasConnection,
} from "./canvas-operations.ts";

/**
 * Obsidian implementation of CanvasOperationAdapter
 *
 * Uses Obsidian's App instance for workspace and file operations
 */
export class ObsidianCanvasAdapter implements CanvasOperationAdapter {
	constructor(private app: App) {}

	getActiveCanvas(): CanvasInfo | null {
		const activeView = this.app.workspace.getActiveViewOfType(TextFileView);

		// Check if active view is a canvas
		if (activeView?.file?.extension === "canvas") {
			const canvasView = activeView as CanvasView;
			if (canvasView.canvas && canvasView.file) {
				return {
					canvas: canvasView.canvas,
					name: canvasView.file.name || "canvas",
				};
			}
		}

		return null;
	}

	getCanvasFromNode(node: ExtendedCanvasConnection): CanvasInfo | null {
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

		return null;
	}

	getCanvasLeaves(): unknown[] {
		return this.app.workspace.getLeavesOfType("canvas");
	}

	getActiveView(): unknown | null {
		return this.app.workspace.getActiveViewOfType(TextFileView);
	}

	async saveCanvas(canvas: CanvasViewCanvas): Promise<void> {
		// Canvas auto-saves, but we can trigger a manual save if needed
		// This is mainly for testing/ensuring persistence
		canvas.requestFrame();
	}

	async modifyFile(path: string, content: string): Promise<void> {
		await this.app.vault.modify(
			this.app.vault.getAbstractFileByPath(path)!,
			content,
		);
	}
}