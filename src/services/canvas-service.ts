import { App, Notice, TextFileView, WorkspaceLeaf } from "obsidian";
import type { CanvasView, CanvasViewCanvas } from "obsidian-typings";

import type {
	CanvasData,
	CanvasNodeData,
	CanvasTextData,
	ExtendedCanvasConnection,
	InferenceContext,
} from "../types/canvas-types.ts";

export class CanvasService {
	constructor(private app: App) {}

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
			// If we can't find the associated file, something is wrong - return null
			return null;
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

	captureInferenceContext(
		canvasFileName: string,
		nodeId: string,
		canvas: CanvasViewCanvas,
		generateId: (length?: number) => string,
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

		return {
			id: generateId(),
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
	}

	createResponseNode(
		sourceNode: ExtendedCanvasConnection,
		response: string,
		isError: boolean = false,
		generateId: (length?: number) => string,
	) {
		if (!sourceNode.canvas || !sourceNode.id) return;

		const canvas = sourceNode.canvas;
		const currentData = canvas.getData() as CanvasData;
		if (!currentData) return;

		const responseId = generateId(16);
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
			id: generateId(16),
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

	async createResponseNodeWithContext(
		context: InferenceContext,
		response: string,
		isError: boolean = false,
		generateId: (length?: number) => string,
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
					await this.app.workspace.openLinkText(
						context.canvasFileName,
						"",
						true,
					);
					// After opening, try to find the leaf again
					targetLeaf = this.findCanvasLeaf(context.canvasFileName);
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

		const responseId = generateId(16);

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
			id: generateId(16),
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
}
