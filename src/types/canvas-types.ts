import type { CanvasConnection, CanvasViewCanvas } from "obsidian-typings";

export type { CanvasContextSettings } from "../ui/settings.ts";
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

interface CanvasEdgeData {
	id: string;
	fromNode: string;
	toNode: string;
	fromSide: string;
	toSide: string;
}

export interface InferenceContext {
	id: string;
	canvasFileName: string;
	sourceNodeId: string;
	sourceNodePosition: {
		x: number;
		y: number;
		width: number;
		height: number;
	};
	timestamp: number;
}
