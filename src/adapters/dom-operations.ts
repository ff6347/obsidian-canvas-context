/**
 * DOM Operations Adapter Interface
 *
 * Abstracts DOM manipulation operations to enable testing without browser dependencies
 */

export interface DOMOperationAdapter {
	/**
	 * Create an HTML element
	 */
	createElement(tagName: string, options?: { className?: string; text?: string }): HTMLElement;

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

/**
 * Simple test implementation for unit testing
 */
export class TestDOMAdapter implements DOMOperationAdapter {
	public createdElements: HTMLElement[] = [];
	public appendOperations: Array<{ parent: HTMLElement; child: HTMLElement }> = [];
	public removedElements: HTMLElement[] = [];
	public eventListeners: Array<{
		element: HTMLElement;
		event: string;
		handler: (event: Event) => void;
		action: "add" | "remove";
	}> = [];
	public iconOperations: Array<{ element: HTMLElement; iconName: string }> = [];
	public queryOperations: Array<{ parent: HTMLElement; selector: string; result: HTMLElement | HTMLElement[] | null }> = [];

	createElement(tagName: string, options?: { className?: string; text?: string }): HTMLElement {
		// Create a mock HTMLElement
		const element = {
			tagName: tagName.toUpperCase(),
			className: options?.className || "",
			textContent: options?.text || "",
			children: [] as HTMLElement[],
			parentElement: null as HTMLElement | null,
		} as unknown as HTMLElement;

		this.createdElements.push(element);
		return element;
	}

	appendChild(parent: HTMLElement, child: HTMLElement): void {
		this.appendOperations.push({ parent, child });
		// Simulate DOM relationship
		(child as any).parentElement = parent;
		(parent as any).children = (parent as any).children || [];
		(parent as any).children.push(child);
	}

	removeElement(element: HTMLElement): void {
		this.removedElements.push(element);
		// Simulate removal
		if ((element as any).parentElement) {
			const parent = (element as any).parentElement;
			const children = (parent as any).children || [];
			const index = children.indexOf(element);
			if (index > -1) {
				children.splice(index, 1);
			}
		}
	}

	addEventListener(
		element: HTMLElement,
		event: string,
		handler: (event: Event) => void,
	): void {
		this.eventListeners.push({ element, event, handler, action: "add" });
	}

	removeEventListener(
		element: HTMLElement,
		event: string,
		handler: (event: Event) => void,
	): void {
		this.eventListeners.push({ element, event, handler, action: "remove" });
	}

	setIcon(element: HTMLElement, iconName: string): void {
		this.iconOperations.push({ element, iconName });
		// Simulate icon being set
		(element as any).dataset = (element as any).dataset || {};
		(element as any).dataset.icon = iconName;
	}

	querySelector(parent: HTMLElement, selector: string): HTMLElement | null {
		// Simple mock implementation - return first child if exists
		const result = (parent as any).children?.[0] || null;
		this.queryOperations.push({ parent, selector, result });
		return result;
	}

	querySelectorAll(parent: HTMLElement, selector: string): HTMLElement[] {
		// Simple mock implementation - return all children
		const result = (parent as any).children || [];
		this.queryOperations.push({ parent, selector, result });
		return result;
	}

	createMutationObserver(callback: MutationCallback): MutationObserver {
		// Return a mock MutationObserver
		return {
			observe: () => {},
			disconnect: () => {},
			takeRecords: () => [],
		} as MutationObserver;
	}

	/**
	 * Test helpers
	 */
	clearOperations(): void {
		this.createdElements = [];
		this.appendOperations = [];
		this.removedElements = [];
		this.eventListeners = [];
		this.iconOperations = [];
		this.queryOperations = [];
	}

	getEventListenersFor(element: HTMLElement, event?: string): Array<{
		element: HTMLElement;
		event: string;
		handler: (event: Event) => void;
		action: "add" | "remove";
	}> {
		return this.eventListeners.filter(
			(listener) => listener.element === element && (!event || listener.event === event),
		);
	}
}