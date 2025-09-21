import type { CanvasViewCanvas } from "obsidian-typings";

/**
 * Canvas Operations Adapter Interface
 *
 * Abstracts canvas-related operations to enable testing without Obsidian dependencies
 */

export interface CanvasInfo {
	canvas: CanvasViewCanvas;
	name: string;
}

export interface ExtendedCanvasConnection {
	canvas?: CanvasViewCanvas;
	id?: string;
}

export interface CanvasOperationAdapter {
	/**
	 * Get active canvas information
	 */
	getActiveCanvas(): CanvasInfo | null;

	/**
	 * Get canvas information from a specific node connection
	 */
	getCanvasFromNode(node: ExtendedCanvasConnection): CanvasInfo | null;

	/**
	 * Get all canvas leaves of a specific type
	 */
	getCanvasLeaves(): unknown[];

	/**
	 * Get active view of a specific type
	 */
	getActiveView(): unknown | null;

	/**
	 * Save canvas data to file
	 */
	saveCanvas(canvas: CanvasViewCanvas): Promise<void>;

	/**
	 * Modify vault file (for persisting canvas changes)
	 */
	modifyFile(path: string, content: string): Promise<void>;
}

/**
 * Simple test implementation for unit testing
 */
export class TestCanvasAdapter implements CanvasOperationAdapter {
	public activeCanvas: CanvasInfo | null = null;
	public canvasLeaves: unknown[] = [];
	public activeView: unknown | null = null;
	public saveOperations: Array<{ canvas: CanvasViewCanvas; timestamp: number }> = [];
	public fileOperations: Array<{ path: string; content: string; timestamp: number }> = [];

	getActiveCanvas(): CanvasInfo | null {
		return this.activeCanvas;
	}

	getCanvasFromNode(node: ExtendedCanvasConnection): CanvasInfo | null {
		// Simple test implementation - return active canvas if node has canvas
		if (node.canvas && this.activeCanvas?.canvas === node.canvas) {
			return this.activeCanvas;
		}
		return null;
	}

	getCanvasLeaves(): unknown[] {
		return this.canvasLeaves;
	}

	getActiveView(): unknown | null {
		return this.activeView;
	}

	async saveCanvas(canvas: CanvasViewCanvas): Promise<void> {
		this.saveOperations.push({ canvas, timestamp: Date.now() });
	}

	async modifyFile(path: string, content: string): Promise<void> {
		this.fileOperations.push({ path, content, timestamp: Date.now() });
	}

	/**
	 * Test helpers
	 */
	setActiveCanvas(canvas: CanvasInfo | null): void {
		this.activeCanvas = canvas;
	}

	setCanvasLeaves(leaves: unknown[]): void {
		this.canvasLeaves = leaves;
	}

	setActiveView(view: unknown | null): void {
		this.activeView = view;
	}

	clearOperations(): void {
		this.saveOperations = [];
		this.fileOperations = [];
	}
}