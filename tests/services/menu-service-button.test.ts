/* oxlint-disable eslint/max-lines-per-function */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MenuService } from "../../src/services/menu-service.ts";

// Mock Obsidian classes and functions
vi.mock("obsidian", () => ({
	Menu: vi.fn(),
	WorkspaceLeaf: vi.fn(),
	setIcon: vi.fn(),
	Notice: vi.fn(),
}));

vi.mock("../../src/main.ts", () => ({
	isSelectionData: vi.fn(),
}));

// Mock JSDOM for DOM operations
Object.defineProperty(global, "document", {
	value: {
		createElement: vi.fn(),
	},
});

Object.defineProperty(global, "MutationObserver", {
	value: vi.fn(),
});

Object.defineProperty(global, "setTimeout", {
	value: vi.fn(),
});

describe("MenuService - Button Management", () => {
	let service: MenuService;
	let mockOnRunInference: ReturnType<typeof vi.fn>;
	let mockCanvasView: any;
	let mockCanvas: any;

	// Import mocked modules
	let setIcon: any;
	let isSelectionData: any;

	beforeEach(async () => {
		vi.clearAllMocks();

		// Import mocked modules
		({ setIcon } = await import("obsidian"));
		({ isSelectionData } = await import("../../src/main.ts"));

		mockOnRunInference = vi.fn();
		service = new MenuService(mockOnRunInference);

		// Setup mock canvas and view
		mockCanvas = {
			getSelectionData: vi.fn(),
			menu: {
				menuEl: null,
				_observerSetup: false,
			},
		};

		mockCanvasView = {
			canvas: mockCanvas,
		};

		// Setup DOM mocks
		vi.mocked(document.createElement).mockReturnValue({
			className: "",
			setAttribute: vi.fn(),
			addEventListener: vi.fn(),
		} as any);
	});

	afterEach(() => {
		vi.resetAllMocks();
		service.cleanup();
	});

	describe("addButtonToCanvasMenu", () => {
		let mockMenuEl: any;
		let mockButton: any;

		beforeEach(() => {
			mockMenuEl = {
				querySelector: vi.fn(),
				appendChild: vi.fn(),
			};
			mockButton = {
				className: "",
				setAttribute: vi.fn(),
				addEventListener: vi.fn(),
			};
			mockCanvas.menu.menuEl = mockMenuEl;

			vi.mocked(document.createElement).mockReturnValue(mockButton);
			vi.mocked(isSelectionData).mockReturnValue(true);
		});

		it("should return early if menu element is missing", () => {
			mockCanvas.menu.menuEl = null;

			service.addButtonToCanvasMenu(mockCanvasView);

			expect(document.createElement).not.toHaveBeenCalled();
		});

		it("should return early if button already exists", () => {
			mockMenuEl.querySelector.mockReturnValue(mockButton); // Button exists

			service.addButtonToCanvasMenu(mockCanvasView);

			expect(document.createElement).not.toHaveBeenCalled();
		});

		it("should not add button for multiple node selection", () => {
			mockMenuEl.querySelector.mockReturnValue(null); // No existing button
			mockCanvas.getSelectionData.mockReturnValue({
				nodes: [{ id: "node-1" }, { id: "node-2" }],
			});

			service.addButtonToCanvasMenu(mockCanvasView);

			expect(document.createElement).not.toHaveBeenCalled();
		});

		it("should not add button for no selection", () => {
			mockMenuEl.querySelector.mockReturnValue(null);
			mockCanvas.getSelectionData.mockReturnValue({ nodes: [] });

			service.addButtonToCanvasMenu(mockCanvasView);

			expect(document.createElement).not.toHaveBeenCalled();
		});

		it("should create and configure button for single node selection", () => {
			mockMenuEl.querySelector.mockReturnValue(null);
			mockCanvas.getSelectionData.mockReturnValue({
				nodes: [{ id: "node-123" }],
			});

			service.addButtonToCanvasMenu(mockCanvasView);

			expect(document.createElement).toHaveBeenCalledWith("button");
			expect(mockButton.className).toBe(
				"clickable-icon canvas-context-inference-btn",
			);
			expect(mockButton.setAttribute).toHaveBeenCalledWith(
				"aria-label",
				"Canvas Context: Run Inference",
			);
			expect(mockButton.setAttribute).toHaveBeenCalledWith(
				"data-tooltip-position",
				"top",
			);
			expect(setIcon).toHaveBeenCalledWith(mockButton, "waypoints");
			expect(mockButton.addEventListener).toHaveBeenCalledWith(
				"click",
				expect.any(Function),
			);
			expect(mockMenuEl.appendChild).toHaveBeenCalledWith(mockButton);
		});

		it("should handle button click correctly", async () => {
			mockMenuEl.querySelector.mockReturnValue(null);
			mockCanvas.getSelectionData.mockReturnValue({
				nodes: [{ id: "node-123" }],
			});

			let clickHandler: any;
			// @ts-ignore
			mockButton.addEventListener.mockImplementation((event, handler) => {
				if (event === "click") {
					clickHandler = handler;
				}
			});

			service.addButtonToCanvasMenu(mockCanvasView);

			// Simulate click event
			const mockEvent = {
				stopPropagation: vi.fn(),
				preventDefault: vi.fn(),
			};

			await clickHandler(mockEvent);

			expect(mockEvent.stopPropagation).toHaveBeenCalled();
			expect(mockEvent.preventDefault).toHaveBeenCalled();
			expect(mockOnRunInference).toHaveBeenCalledWith("node-123", mockCanvas);
		});

		it("should handle button click errors gracefully", async () => {
			mockMenuEl.querySelector.mockReturnValue(null);
			mockCanvas.getSelectionData.mockReturnValue({
				nodes: [{ id: "node-123" }],
			});

			mockOnRunInference.mockRejectedValue(new Error("Inference failed"));

			let clickHandler: any;
			// @ts-ignore
			mockButton.addEventListener.mockImplementation((event, handler) => {
				if (event === "click") {
					clickHandler = handler;
				}
			});

			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(
					/* eslint-disable-next-line no-empty-function */ () => {},
				);

			service.addButtonToCanvasMenu(mockCanvasView);

			const mockEvent = {
				stopPropagation: vi.fn(),
				preventDefault: vi.fn(),
			};

			await clickHandler(mockEvent);

			expect(consoleSpy).toHaveBeenCalledWith(
				"Inference error:",
				expect.any(Error),
			);

			consoleSpy.mockRestore();
		});

		it("should not run inference for invalid node ID", async () => {
			mockMenuEl.querySelector.mockReturnValue(null);
			// Return different selection data in button click
			mockCanvas.getSelectionData
				.mockReturnValueOnce({ nodes: [{ id: "node-123" }] }) // For addButton
				.mockReturnValueOnce({ nodes: [{ id: null }] }); // For click handler

			let clickHandler: any;
			// @ts-ignore
			mockButton.addEventListener.mockImplementation((event, handler) => {
				if (event === "click") {
					clickHandler = handler;
				}
			});

			service.addButtonToCanvasMenu(mockCanvasView);

			const mockEvent = {
				stopPropagation: vi.fn(),
				preventDefault: vi.fn(),
			};

			await clickHandler(mockEvent);

			expect(mockOnRunInference).not.toHaveBeenCalled();
		});

		it("should handle invalid selection data in click handler", async () => {
			mockMenuEl.querySelector.mockReturnValue(null);
			mockCanvas.getSelectionData.mockReturnValue({
				nodes: [{ id: "node-123" }],
			});

			let clickHandler: any;
			// @ts-ignore
			mockButton.addEventListener.mockImplementation((event, handler) => {
				if (event === "click") {
					clickHandler = handler;
				}
			});

			service.addButtonToCanvasMenu(mockCanvasView);

			// Mock invalid selection data for click handler
			vi.mocked(isSelectionData).mockReturnValueOnce(false);

			const mockEvent = {
				stopPropagation: vi.fn(),
				preventDefault: vi.fn(),
			};

			await clickHandler(mockEvent);

			expect(mockOnRunInference).not.toHaveBeenCalled();
		});

		it("should handle general errors gracefully", () => {
			mockCanvas.getSelectionData.mockImplementation(() => {
				throw new Error("getSelectionData failed");
			});

			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(
					/* eslint-disable-next-line no-empty-function */ () => {},
				);

			service.addButtonToCanvasMenu(mockCanvasView);

			expect(consoleSpy).toHaveBeenCalledWith(
				"Error adding button to canvas menu:",
				expect.any(Error),
			);

			consoleSpy.mockRestore();
		});
	});
});
