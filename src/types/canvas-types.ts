import type { CanvasConnection, CanvasViewCanvas } from "obsidian-typings";

// }
export interface ExtendedCanvasConnection extends CanvasConnection {
	id?: string;
	canvas?: CanvasViewCanvas;
}

export interface CanvasData {
	nodes: CanvasNodeData[];
	edges: CanvasEdgeData[];
}

export interface CanvasNodeData {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	type: "text" | "file" | "group";
	color?: string;
}

export interface CanvasTextData extends CanvasNodeData {
	type: "text";
	text: string;
}

export interface CanvasEdgeData {
	id: string;
	fromNode: string;
	toNode: string;
	fromSide: string;
	toSide: string;
}
