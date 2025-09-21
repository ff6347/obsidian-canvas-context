import { describe, expect, it } from "vitest";
import {
	TestNotificationAdapter,
	TestCanvasAdapter,
	TestUIComponentAdapter,
	TestDOMAdapter,
} from "../../src/adapters/index.ts";

/**
 * Unit tests for adapter pattern implementations
 * These tests verify the test adapters work correctly for service testing
 */

describe("TestNotificationAdapter", () => {
	it("should track notification messages", () => {
		const adapter = new TestNotificationAdapter();

		adapter.showInfo("Info message");
		adapter.showError("Error message");
		adapter.showSuccess("Success message");
		adapter.showLoading("Loading...");
		adapter.hideLoading();

		expect(adapter.messages).toHaveLength(5);
		expect(adapter.getMessagesOfType("info")).toHaveLength(1);
		expect(adapter.getMessagesOfType("error")).toHaveLength(1);
		expect(adapter.getMessagesOfType("success")).toHaveLength(1);
		expect(adapter.getMessagesOfType("loading")).toHaveLength(1);
		expect(adapter.getMessagesOfType("hideLoading")).toHaveLength(1);
	});

	it("should clear messages", () => {
		const adapter = new TestNotificationAdapter();
		adapter.showInfo("Test");
		expect(adapter.messages).toHaveLength(1);

		adapter.clearMessages();
		expect(adapter.messages).toHaveLength(0);
	});
});

describe("TestCanvasAdapter", () => {
	it("should manage canvas state", () => {
		const adapter = new TestCanvasAdapter();

		// Initially no active canvas
		expect(adapter.getActiveCanvas()).toBeNull();

		// Set active canvas
		const mockCanvas = { name: "test.canvas", canvas: {} as any };
		adapter.setActiveCanvas(mockCanvas);
		expect(adapter.getActiveCanvas()).toBe(mockCanvas);
	});

	it("should track canvas operations", async () => {
		const adapter = new TestCanvasAdapter();
		const mockCanvas = {} as any;

		await adapter.saveCanvas(mockCanvas);
		await adapter.modifyFile("test.canvas", "content");

		expect(adapter.saveOperations).toHaveLength(1);
		expect(adapter.fileOperations).toHaveLength(1);
		expect(adapter.fileOperations[0].path).toBe("test.canvas");
		expect(adapter.fileOperations[0].content).toBe("content");
	});
});

describe("TestUIComponentAdapter", () => {
	it("should track button state changes", () => {
		const adapter = new TestUIComponentAdapter();
		const mockButton = { id: "test-button" };

		adapter.setButtonText(mockButton, "Click me");
		adapter.setButtonDisabled(mockButton, true);

		const state = adapter.getButtonState(mockButton);
		expect(state?.text).toBe("Click me");
		expect(state?.disabled).toBe(true);
	});

	it("should manage select element state", () => {
		const adapter = new TestUIComponentAdapter();
		const mockSelect = {} as HTMLSelectElement;

		adapter.createSelectOption(mockSelect, "value1", "Option 1");
		adapter.createSelectOption(mockSelect, "value2", "Option 2");
		adapter.setSelectDisabled(mockSelect, true);

		const state = adapter.getSelectState(mockSelect);
		expect(state?.options).toHaveLength(2);
		expect(state?.disabled).toBe(true);
		expect(state?.options[0]).toEqual({ value: "value1", text: "Option 1" });
	});

	it("should handle element values", () => {
		const adapter = new TestUIComponentAdapter();
		const mockElement = {} as HTMLElement;

		adapter.setElementValue(mockElement, "test value");
		expect(adapter.getElementValue(mockElement)).toBe("test value");
	});
});

describe("TestDOMAdapter", () => {
	it("should create and manage elements", () => {
		const adapter = new TestDOMAdapter();

		const element = adapter.createElement("div", { className: "test", text: "Hello" });
		expect(adapter.createdElements).toHaveLength(1);
		expect(element.tagName).toBe("DIV");
		expect(element.className).toBe("test");
		expect(element.textContent).toBe("Hello");
	});

	it("should track DOM operations", () => {
		const adapter = new TestDOMAdapter();
		const parent = adapter.createElement("div");
		const child = adapter.createElement("span");

		adapter.appendChild(parent, child);
		adapter.setIcon(child, "star");

		expect(adapter.appendOperations).toHaveLength(1);
		expect(adapter.iconOperations).toHaveLength(1);
		expect(adapter.iconOperations[0].iconName).toBe("star");
	});

	it("should track event listeners", () => {
		const adapter = new TestDOMAdapter();
		const element = adapter.createElement("button");
		const handler = () => {};

		adapter.addEventListener(element, "click", handler);
		adapter.removeEventListener(element, "click", handler);

		const listeners = adapter.getEventListenersFor(element, "click");
		expect(listeners).toHaveLength(2);
		expect(listeners[0].action).toBe("add");
		expect(listeners[1].action).toBe("remove");
	});

	it("should create mutation observer", () => {
		const adapter = new TestDOMAdapter();
		const observer = adapter.createMutationObserver(() => {});

		expect(observer).toBeDefined();
		expect(typeof observer.observe).toBe("function");
		expect(typeof observer.disconnect).toBe("function");
	});
});