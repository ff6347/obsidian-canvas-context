import { describe, it, expect } from "vitest";
import {
	shouldShowInferenceButton,
	getFirstNodeId,
	createButtonConfig,
	shouldSetupObserver,
} from "../../src/lib/menu-logic.ts";

describe("menu-logic", () => {
	describe("shouldShowInferenceButton", () => {
		it("returns true for single node selection", () => {
			expect(shouldShowInferenceButton(1)).toBe(true);
		});

		it("returns false for no nodes", () => {
			expect(shouldShowInferenceButton(0)).toBe(false);
		});

		it("returns false for multiple nodes", () => {
			expect(shouldShowInferenceButton(2)).toBe(false);
			expect(shouldShowInferenceButton(5)).toBe(false);
		});

		it("returns false for negative counts", () => {
			expect(shouldShowInferenceButton(-1)).toBe(false);
		});
	});


	describe("getFirstNodeId", () => {
		it("returns node ID for valid first node", () => {
			const nodes = [{ id: "node-1" }, { id: "node-2" }];
			expect(getFirstNodeId(nodes)).toBe("node-1");
		});

		it("returns null for empty array", () => {
			expect(getFirstNodeId([])).toBe(null);
		});

		it("returns null for non-array input", () => {
			expect(getFirstNodeId(null as any)).toBe(null);
			expect(getFirstNodeId(undefined as any)).toBe(null);
			expect(getFirstNodeId("not array" as any)).toBe(null);
		});

		it("returns null when first node has no id", () => {
			const nodes = [{ name: "no-id" }];
			expect(getFirstNodeId(nodes as any)).toBe(null);
		});

		it("returns null when first node id is not string", () => {
			const nodes = [{ id: 123 }];
			expect(getFirstNodeId(nodes as any)).toBe(null);
		});

		it("returns null when first node is null", () => {
			const nodes = [null];
			expect(getFirstNodeId(nodes as any)).toBe(null);
		});

		it("returns first valid ID even with invalid second node", () => {
			const nodes = [{ id: "valid" }, null];
			expect(getFirstNodeId(nodes as any)).toBe("valid");
		});
	});

	describe("createButtonConfig", () => {
		it("returns consistent button configuration", () => {
			const config = createButtonConfig();
			expect(config).toEqual({
				className: "clickable-icon canvas-context-inference-btn",
				ariaLabel: "Canvas Context: Run Inference",
				dataTooltipPosition: "top",
			});
		});

		it("returns same config on multiple calls", () => {
			const config1 = createButtonConfig();
			const config2 = createButtonConfig();
			expect(config1).toEqual(config2);
		});
	});

	describe("shouldSetupObserver", () => {
		it("returns true for valid canvas without observer", () => {
			const canvas = {
				menu: {
					_observerSetup: false,
				},
			};
			expect(shouldSetupObserver(canvas)).toBe(true);
		});

		it("returns false when observer already setup", () => {
			const canvas = {
				menu: {
					_observerSetup: true,
				},
			};
			expect(shouldSetupObserver(canvas)).toBe(false);
		});

		it("returns false for null canvas", () => {
			expect(shouldSetupObserver(null)).toBe(false);
		});

		it("returns false for undefined canvas", () => {
			expect(shouldSetupObserver(undefined)).toBe(false);
		});

		it("returns false for canvas without menu", () => {
			const canvas = { other: "property" };
			expect(shouldSetupObserver(canvas)).toBe(false);
		});

		it("returns false for canvas with null menu", () => {
			const canvas = { menu: null };
			expect(shouldSetupObserver(canvas)).toBe(false);
		});

		it("returns true when _observerSetup is undefined", () => {
			const canvas = { menu: {} };
			expect(shouldSetupObserver(canvas)).toBe(true);
		});
	});
});