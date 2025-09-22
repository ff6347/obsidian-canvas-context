import type { CanvasViewCanvas } from "obsidian-typings";
import type { ExtendedCanvasConnection } from "./canvas-types.ts";

/**
 * Adapter Pattern Type Definitions
 *
 * This module contains all adapter interfaces used to decouple business logic
 * from platform-specific APIs (Obsidian, DOM, etc.).
 *
 * Benefits:
 * - Testable business logic with simple test doubles
 * - Clear separation of concerns
 * - Easy to mock for unit tests
 * - Platform-agnostic core logic
 */

// ==================== Canvas Operations ====================

export interface CanvasInfo {
	canvas: CanvasViewCanvas;
	name: string;
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

// ==================== UI Notifications ====================

export interface UINotificationAdapter {
	/**
	 * Show an informational message to the user
	 */
	showInfo(message: string): void;

	/**
	 * Show an error message to the user
	 */
	showError(message: string): void;

	/**
	 * Show a success message to the user
	 */
	showSuccess(message: string): void;

	/**
	 * Show loading status with optional text
	 */
	showLoading(text?: string): void;

	/**
	 * Hide loading status
	 */
	hideLoading(): void;
}

// ==================== UI Components ====================

export interface ButtonState {
	text: string;
	disabled: boolean;
}

export interface UIComponentAdapter {
	/**
	 * Set button text
	 */
	setButtonText(button: unknown, text: string): void;

	/**
	 * Set button disabled state
	 */
	setButtonDisabled(button: unknown, disabled: boolean): void;

	/**
	 * Create and append option to select element
	 */
	createSelectOption(
		select: HTMLSelectElement,
		value: string,
		text: string,
	): void;

	/**
	 * Clear select element options
	 */
	clearSelectOptions(select: HTMLSelectElement): void;

	/**
	 * Set select element disabled state
	 */
	setSelectDisabled(select: HTMLSelectElement, disabled: boolean): void;

	/**
	 * Set HTML element innerHTML
	 */
	setElementHTML(element: HTMLElement, html: string): void;

	/**
	 * Get element value
	 */
	getElementValue(element: HTMLElement): string;

	/**
	 * Set element value
	 */
	setElementValue(element: HTMLElement, value: string): void;
}

// ==================== DOM Operations ====================

export interface DOMOperationAdapter {
	/**
	 * Create an HTML element
	 */
	createElement(
		tagName: string,
		options?: { className?: string; text?: string },
	): HTMLElement;

	/**
	 * Append child to parent element
	 */
	appendChild(parent: HTMLElement, child: HTMLElement): void;

	/**
	 * Remove element from DOM
	 */
	removeElement(element: HTMLElement): void;

	/**
	 * Add event listener to element
	 */
	addEventListener(
		element: HTMLElement,
		event: string,
		handler: (event: Event) => void,
	): void;

	/**
	 * Remove event listener from element
	 */
	removeEventListener(
		element: HTMLElement,
		event: string,
		handler: (event: Event) => void,
	): void;

	/**
	 * Set icon for element (using Obsidian's setIcon)
	 */
	setIcon(element: HTMLElement, iconName: string): void;

	/**
	 * Query selector on element
	 */
	querySelector(parent: HTMLElement, selector: string): HTMLElement | null;

	/**
	 * Query selector all on element
	 */
	querySelectorAll(parent: HTMLElement, selector: string): HTMLElement[];

	/**
	 * Create mutation observer
	 */
	createMutationObserver(callback: MutationCallback): MutationObserver;
}
