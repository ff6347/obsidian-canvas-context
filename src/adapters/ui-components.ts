/**
 * UI Components Adapter Interface
 *
 * Abstracts UI component operations (buttons, settings, forms) to enable testing
 */

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
	createSelectOption(select: HTMLSelectElement, value: string, text: string): void;

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

/**
 * Simple test implementation for unit testing
 */
export class TestUIComponentAdapter implements UIComponentAdapter {
	public buttonStates: Map<unknown, ButtonState> = new Map();
	public selectStates: Map<HTMLSelectElement, { disabled: boolean; options: Array<{ value: string; text: string }> }> = new Map();
	public elementValues: Map<HTMLElement, string> = new Map();
	public elementHTML: Map<HTMLElement, string> = new Map();

	setButtonText(button: unknown, text: string): void {
		const currentState = this.buttonStates.get(button) || { text: "", disabled: false };
		this.buttonStates.set(button, { ...currentState, text });
	}

	setButtonDisabled(button: unknown, disabled: boolean): void {
		const currentState = this.buttonStates.get(button) || { text: "", disabled: false };
		this.buttonStates.set(button, { ...currentState, disabled });
	}

	createSelectOption(select: HTMLSelectElement, value: string, text: string): void {
		const currentState = this.selectStates.get(select) || { disabled: false, options: [] };
		currentState.options.push({ value, text });
		this.selectStates.set(select, currentState);
	}

	clearSelectOptions(select: HTMLSelectElement): void {
		const currentState = this.selectStates.get(select) || { disabled: false, options: [] };
		currentState.options = [];
		this.selectStates.set(select, currentState);
	}

	setSelectDisabled(select: HTMLSelectElement, disabled: boolean): void {
		const currentState = this.selectStates.get(select) || { disabled: false, options: [] };
		currentState.disabled = disabled;
		this.selectStates.set(select, currentState);
	}

	setElementHTML(element: HTMLElement, html: string): void {
		this.elementHTML.set(element, html);
	}

	getElementValue(element: HTMLElement): string {
		return this.elementValues.get(element) || "";
	}

	setElementValue(element: HTMLElement, value: string): void {
		this.elementValues.set(element, value);
	}

	/**
	 * Test helpers
	 */
	getButtonState(button: unknown): ButtonState | undefined {
		return this.buttonStates.get(button);
	}

	getSelectState(select: HTMLSelectElement) {
		return this.selectStates.get(select);
	}

	clearAllStates(): void {
		this.buttonStates.clear();
		this.selectStates.clear();
		this.elementValues.clear();
		this.elementHTML.clear();
	}
}