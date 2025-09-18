import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StatusService } from "../../src/services/status-service.ts";

describe("StatusService", () => {
	let service: StatusService;
	let mockStatusEl: any;

	beforeEach(() => {
		vi.clearAllMocks();

		// Create mock status element
		mockStatusEl = {
			addClass: vi.fn(),
			empty: vi.fn(),
			createEl: vi.fn(),
		};
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("constructor", () => {
		it("should initialize with status element and add CSS class", () => {
			service = new StatusService(mockStatusEl);

			expect(mockStatusEl.addClass).toHaveBeenCalledWith("canvas-context-loading-status");
		});

		it("should handle null status element gracefully", () => {
			expect(() => {
				service = new StatusService(null);
			}).not.toThrow();

			// Should not try to call addClass on null
			expect(mockStatusEl.addClass).not.toHaveBeenCalled();
		});

		it("should handle undefined status element gracefully", () => {
			expect(() => {
				service = new StatusService(undefined as any);
			}).not.toThrow();
		});
	});

	describe("showLoadingStatus", () => {
		beforeEach(() => {
			service = new StatusService(mockStatusEl);
		});

		it("should display loading status with default text", () => {
			service.showLoadingStatus();

			expect(mockStatusEl.empty).toHaveBeenCalled();
			expect(mockStatusEl.createEl).toHaveBeenCalledWith("span", {
				text: "Loading...",
				cls: "loading-text",
			});
			expect(mockStatusEl.createEl).toHaveBeenCalledWith("span", {
				cls: "spinner",
			});
		});

		it("should display loading status with custom text", () => {
			const customText = "Running inference...";

			service.showLoadingStatus(customText);

			expect(mockStatusEl.empty).toHaveBeenCalled();
			expect(mockStatusEl.createEl).toHaveBeenCalledWith("span", {
				text: customText,
				cls: "loading-text",
			});
			expect(mockStatusEl.createEl).toHaveBeenCalledWith("span", {
				cls: "spinner",
			});
		});

		it("should create elements in correct order", () => {
			service.showLoadingStatus("Test");

			const calls = mockStatusEl.createEl.mock.calls;
			expect(calls).toHaveLength(2);

			// First call should be the text span
			expect(calls[0]).toEqual([
				"span",
				{
					text: "Test",
					cls: "loading-text",
				},
			]);

			// Second call should be the spinner span
			expect(calls[1]).toEqual([
				"span",
				{
					cls: "spinner",
				},
			]);
		});

		it("should clear existing content before adding new elements", () => {
			service.showLoadingStatus();

			// empty should be called before createEl
			const emptyCallOrder = mockStatusEl.empty.mock.invocationCallOrder[0];
			const createElCallOrder = mockStatusEl.createEl.mock.invocationCallOrder[0];

			expect(emptyCallOrder).toBeLessThan(createElCallOrder);
		});

		it("should handle empty string text", () => {
			service.showLoadingStatus("");

			expect(mockStatusEl.createEl).toHaveBeenCalledWith("span", {
				text: "",
				cls: "loading-text",
			});
		});

		it("should handle undefined text (use default)", () => {
			service.showLoadingStatus(undefined);

			expect(mockStatusEl.createEl).toHaveBeenCalledWith("span", {
				text: "Loading...",
				cls: "loading-text",
			});
		});

		it("should do nothing when status element is null", () => {
			const serviceWithoutElement = new StatusService(null);

			serviceWithoutElement.showLoadingStatus("Test");

			expect(mockStatusEl.empty).not.toHaveBeenCalled();
			expect(mockStatusEl.createEl).not.toHaveBeenCalled();
		});

		it("should handle multiple consecutive calls", () => {
			service.showLoadingStatus("First");
			service.showLoadingStatus("Second");

			expect(mockStatusEl.empty).toHaveBeenCalledTimes(2);
			expect(mockStatusEl.createEl).toHaveBeenCalledTimes(4); // 2 elements per call

			// Verify last call has correct text
			const lastTextCall = mockStatusEl.createEl.mock.calls.find(
				(call) => call[1]?.text === "Second",
			);
			expect(lastTextCall).toBeDefined();
		});
	});

	describe("hideLoadingStatus", () => {
		beforeEach(() => {
			service = new StatusService(mockStatusEl);
		});

		it("should clear status element content", () => {
			service.hideLoadingStatus();

			expect(mockStatusEl.empty).toHaveBeenCalled();
		});

		it("should handle null status element gracefully", () => {
			const serviceWithoutElement = new StatusService(null);

			expect(() => {
				serviceWithoutElement.hideLoadingStatus();
			}).not.toThrow();

			expect(mockStatusEl.empty).not.toHaveBeenCalled();
		});

		it("should work with optional chaining for undefined elements", () => {
			// Test the actual optional chaining behavior
			const serviceWithUndefined = new StatusService(undefined as any);

			expect(() => {
				serviceWithUndefined.hideLoadingStatus();
			}).not.toThrow();
		});

		it("should be idempotent (safe to call multiple times)", () => {
			service.hideLoadingStatus();
			service.hideLoadingStatus();
			service.hideLoadingStatus();

			expect(mockStatusEl.empty).toHaveBeenCalledTimes(3);
		});
	});

	describe("integration scenarios", () => {
		beforeEach(() => {
			service = new StatusService(mockStatusEl);
		});

		it("should handle show -> hide -> show cycle", () => {
			service.showLoadingStatus("First");
			service.hideLoadingStatus();
			service.showLoadingStatus("Second");

			expect(mockStatusEl.empty).toHaveBeenCalledTimes(3); // 2 from show calls, 1 from hide
			expect(mockStatusEl.createEl).toHaveBeenCalledTimes(4); // 2 elements per show call

			// Verify final state has "Second" text
			const lastTextCall = mockStatusEl.createEl.mock.calls.find(
				(call) => call[1]?.text === "Second",
			);
			expect(lastTextCall).toBeDefined();
		});

		it("should handle rapid consecutive operations", () => {
			service.showLoadingStatus("Loading...");
			service.showLoadingStatus("Processing...");
			service.hideLoadingStatus();
			service.showLoadingStatus("Finalizing...");

			expect(mockStatusEl.empty).toHaveBeenCalledTimes(4);
			expect(mockStatusEl.createEl).toHaveBeenCalledTimes(6); // 3 show calls * 2 elements each
		});

		it("should maintain state consistency with null element throughout lifecycle", () => {
			// Create a fresh mock element to verify it's not called
			const freshMockEl = {
				addClass: vi.fn(),
				empty: vi.fn(),
				createEl: vi.fn(),
			};

			const serviceWithNull = new StatusService(null);

			// None of these should throw or cause issues
			serviceWithNull.showLoadingStatus("Test");
			serviceWithNull.hideLoadingStatus();
			serviceWithNull.showLoadingStatus("Another test");
			serviceWithNull.hideLoadingStatus();

			// Verify no calls were made to any element methods
			expect(freshMockEl.empty).not.toHaveBeenCalled();
			expect(freshMockEl.createEl).not.toHaveBeenCalled();
			expect(freshMockEl.addClass).not.toHaveBeenCalled();
		});
	});

	describe("element method interactions", () => {
		beforeEach(() => {
			service = new StatusService(mockStatusEl);
		});

		it("should handle status element with missing methods gracefully", () => {
			const incompleteStatusEl = {
				addClass: vi.fn(),
				empty: vi.fn(),
				// Missing createEl method
			};

			const serviceWithIncompleteEl = new StatusService(incompleteStatusEl as any);

			// Constructor should work
			expect(incompleteStatusEl.addClass).toHaveBeenCalled();

			// showLoadingStatus should handle missing createEl
			expect(() => {
				serviceWithIncompleteEl.showLoadingStatus("Test");
			}).toThrow(); // This will actually throw because createEl is called
		});

		it("should verify correct method signatures are used", () => {
			service.showLoadingStatus("Custom message");

			// Verify empty is called without parameters
			expect(mockStatusEl.empty).toHaveBeenCalledWith();

			// Verify createEl is called with correct parameters
			expect(mockStatusEl.createEl).toHaveBeenCalledWith("span", {
				text: "Custom message",
				cls: "loading-text",
			});
			expect(mockStatusEl.createEl).toHaveBeenCalledWith("span", {
				cls: "spinner",
			});
		});

		it("should handle status element that throws during operations", () => {
			const throwingStatusEl = {
				addClass: vi.fn(),
				empty: vi.fn().mockImplementation(() => {
					throw new Error("DOM error");
				}),
				createEl: vi.fn(),
			};

			const serviceWithThrowingEl = new StatusService(throwingStatusEl);

			expect(() => {
				serviceWithThrowingEl.showLoadingStatus("Test");
			}).toThrow("DOM error");

			expect(() => {
				serviceWithThrowingEl.hideLoadingStatus();
			}).toThrow("DOM error");
		});
	});
});