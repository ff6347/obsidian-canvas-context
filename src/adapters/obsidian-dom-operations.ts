import { setIcon } from "obsidian";
import type { DOMOperationAdapter } from "./dom-operations.ts";

/**
 * Obsidian implementation of DOMOperationAdapter
 *
 * Uses standard DOM operations and Obsidian's setIcon utility
 */
export class ObsidianDOMAdapter implements DOMOperationAdapter {
	createElement(tagName: string, options?: { className?: string; text?: string }): HTMLElement {
		const element = document.createElement(tagName);
		if (options?.className) {
			element.className = options.className;
		}
		if (options?.text) {
			element.textContent = options.text;
		}
		return element;
	}

	appendChild(parent: HTMLElement, child: HTMLElement): void {
		parent.appendChild(child);
	}

	removeElement(element: HTMLElement): void {
		element.remove();
	}

	addEventListener(
		element: HTMLElement,
		event: string,
		handler: (event: Event) => void,
	): void {
		element.addEventListener(event, handler);
	}

	removeEventListener(
		element: HTMLElement,
		event: string,
		handler: (event: Event) => void,
	): void {
		element.removeEventListener(event, handler);
	}

	setIcon(element: HTMLElement, iconName: string): void {
		setIcon(element, iconName);
	}

	querySelector(parent: HTMLElement, selector: string): HTMLElement | null {
		return parent.querySelector(selector);
	}

	querySelectorAll(parent: HTMLElement, selector: string): HTMLElement[] {
		return Array.from(parent.querySelectorAll(selector));
	}

	createMutationObserver(callback: MutationCallback): MutationObserver {
		return new MutationObserver(callback);
	}
}