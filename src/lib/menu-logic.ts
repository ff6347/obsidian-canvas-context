/**
 * Pure menu logic functions
 * No Obsidian dependencies - can be tested without mocks
 */

interface ButtonConfig {
	className: string;
	ariaLabel: string;
	dataTooltipPosition: string;
}

/**
 * Determine if inference button should be shown based on selection count
 */
export function shouldShowInferenceButton(nodeCount: number): boolean {
	return nodeCount === 1;
}


/**
 * Safely extract first node ID from nodes array
 */
export function getFirstNodeId(nodes: Array<{ id: unknown }>): string | null {
	if (!Array.isArray(nodes) || nodes.length === 0) {
		return null;
	}

	const firstNode = nodes[0];
	if (!firstNode || typeof firstNode.id !== "string") {
		return null;
	}

	return firstNode.id;
}

/**
 * Create button configuration object
 */
export function createButtonConfig(): ButtonConfig {
	return {
		className: "clickable-icon canvas-context-inference-btn",
		ariaLabel: "Canvas Context: Run Inference",
		dataTooltipPosition: "top",
	};
}

/**
 * Determine if observer should be set up for canvas
 */
export function shouldSetupObserver(canvas: any): boolean {
	return !!(
		canvas &&
		canvas.menu &&
		canvas.menu._observerSetup !== true
	);
}