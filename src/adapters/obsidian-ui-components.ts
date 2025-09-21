import { ButtonComponent } from "obsidian";
import type { UIComponentAdapter } from "./ui-components.ts";

/**
 * Obsidian implementation of UIComponentAdapter
 *
 * Uses Obsidian's UI components and standard DOM operations
 */
export class ObsidianUIComponentAdapter implements UIComponentAdapter {
	setButtonText(button: unknown, text: string): void {
		if (button instanceof ButtonComponent) {
			button.setButtonText(text);
		}
	}

	setButtonDisabled(button: unknown, disabled: boolean): void {
		if (button instanceof ButtonComponent) {
			button.setDisabled(disabled);
		}
	}

	createSelectOption(select: HTMLSelectElement, value: string, text: string): void {
		const option = select.createEl("option", {
			value,
			text,
		});
		select.appendChild(option);
	}

	clearSelectOptions(select: HTMLSelectElement): void {
		select.innerHTML = "";
	}

	setSelectDisabled(select: HTMLSelectElement, disabled: boolean): void {
		select.disabled = disabled;
	}

	setElementHTML(element: HTMLElement, html: string): void {
		element.innerHTML = html;
	}

	getElementValue(element: HTMLElement): string {
		if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement) {
			return element.value;
		}
		return element.textContent || "";
	}

	setElementValue(element: HTMLElement, value: string): void {
		if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement) {
			element.value = value;
		} else {
			element.textContent = value;
		}
	}
}