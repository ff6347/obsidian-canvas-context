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

describe("MenuService - Selection Menu", () => {
	let service: MenuService;
	let mockOnRunInference: ReturnType<typeof vi.fn>;
	let mockCanvasView: any;
	let mockCanvas: any;
	let mockMenu: any;

	// Import mocked modules
	let Notice: any;
	let isSelectionData: any;

	beforeEach(async () => {
		vi.clearAllMocks();

		// Import mocked modules
		({ Notice } = await import("obsidian"));
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

		// Setup mock menu
		mockMenu = {
			addItem: vi.fn(),
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

	describe("buildSelectionMenu", () => {
		beforeEach(() => {
			vi.mocked(isSelectionData).mockReturnValue(true);
		});

		it("should add inference menu item for single node selection", () => {
			const mockSelectedNode = { id: "node-123" };
			const mockSelectionData = { nodes: [mockSelectedNode] };
			mockCanvas.getSelectionData.mockReturnValue(mockSelectionData);

			const mockItem = {
				setTitle: vi.fn().mockReturnThis(),
				setIcon: vi.fn().mockReturnThis(),
				onClick: vi.fn().mockReturnThis(),
			};
			mockMenu.addItem.mockImplementation((callback: any) => {
				callback(mockItem);
			});

			service.buildSelectionMenu(mockMenu, mockCanvasView);

			expect(mockMenu.addItem).toHaveBeenCalled();
			expect(mockItem.setTitle).toHaveBeenCalledWith(
				"Canvas Context: Run Inference",
			);
			expect(mockItem.setIcon).toHaveBeenCalledWith("waypoints");
			expect(mockItem.onClick).toHaveBeenCalled();
		});

		it("should not add menu item for multiple node selection", () => {
			const mockSelectionData = {
				nodes: [{ id: "node-1" }, { id: "node-2" }],
			};
			mockCanvas.getSelectionData.mockReturnValue(mockSelectionData);

			service.buildSelectionMenu(mockMenu, mockCanvasView);

			expect(mockMenu.addItem).not.toHaveBeenCalled();
		});

		it("should not add menu item for no node selection", () => {
			const mockSelectionData = { nodes: [] };
			mockCanvas.getSelectionData.mockReturnValue(mockSelectionData);

			service.buildSelectionMenu(mockMenu, mockCanvasView);

			expect(mockMenu.addItem).not.toHaveBeenCalled();
		});

		it("should handle invalid selection data gracefully", () => {
			vi.mocked(isSelectionData).mockReturnValue(false);
			mockCanvas.getSelectionData.mockReturnValue({ invalid: "data" });

			service.buildSelectionMenu(mockMenu, mockCanvasView);

			expect(mockMenu.addItem).not.toHaveBeenCalled();
		});

		it("should execute inference when menu item is clicked", async () => {
			const mockSelectedNode = { id: "node-123" };
			const mockSelectionData = { nodes: [mockSelectedNode] };
			mockCanvas.getSelectionData.mockReturnValue(mockSelectionData);

			let onClickCallback: any;
			const mockItem = {
				setTitle: vi.fn().mockReturnThis(),
				setIcon: vi.fn().mockReturnThis(),
				onClick: vi.fn().mockImplementation((callback) => {
					onClickCallback = callback;
					return mockItem;
				}),
			};
			mockMenu.addItem.mockImplementation((callback: any) => {
				callback(mockItem);
			});

			service.buildSelectionMenu(mockMenu, mockCanvasView);

			// Simulate clicking the menu item
			await onClickCallback();

			expect(mockOnRunInference).toHaveBeenCalledWith("node-123", mockCanvas);
		});

		it("should handle inference errors gracefully", async () => {
			const mockSelectedNode = { id: "node-123" };
			const mockSelectionData = { nodes: [mockSelectedNode] };
			mockCanvas.getSelectionData.mockReturnValue(mockSelectionData);

			mockOnRunInference.mockRejectedValue(new Error("Inference failed"));

			let onClickCallback: any;
			const mockItem = {
				setTitle: vi.fn().mockReturnThis(),
				setIcon: vi.fn().mockReturnThis(),
				onClick: vi.fn().mockImplementation((callback) => {
					onClickCallback = callback;
					return mockItem;
				}),
			};
			mockMenu.addItem.mockImplementation((callback: any) => {
				callback(mockItem);
			});

			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(
					/* eslint-disable-next-line no-empty-function */ () => {},
				);

			service.buildSelectionMenu(mockMenu, mockCanvasView);
			await onClickCallback();

			expect(consoleSpy).toHaveBeenCalledWith(
				"Error running inference from selection menu:",
				expect.any(Error),
			);
			expect(Notice).toHaveBeenCalledWith(
				"Failed to run inference. Check console for details.",
			);

			consoleSpy.mockRestore();
		});

		it("should not execute inference for node without ID", async () => {
			const mockSelectedNode = { id: null };
			const mockSelectionData = { nodes: [mockSelectedNode] };
			mockCanvas.getSelectionData.mockReturnValue(mockSelectionData);

			let onClickCallback: any;
			const mockItem = {
				setTitle: vi.fn().mockReturnThis(),
				setIcon: vi.fn().mockReturnThis(),
				onClick: vi.fn().mockImplementation((callback) => {
					onClickCallback = callback;
					return mockItem;
				}),
			};
			mockMenu.addItem.mockImplementation((callback: any) => {
				callback(mockItem);
			});

			service.buildSelectionMenu(mockMenu, mockCanvasView);
			await onClickCallback();

			expect(mockOnRunInference).not.toHaveBeenCalled();
		});

		it("should handle canvas.getSelectionData errors gracefully", () => {
			mockCanvas.getSelectionData.mockImplementation(() => {
				throw new Error("getSelectionData failed");
			});

			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(
					/* eslint-disable-next-line no-empty-function */ () => {},
				);

			service.buildSelectionMenu(mockMenu, mockCanvasView);

			expect(consoleSpy).toHaveBeenCalledWith(
				"Error in buildSelectionMenu:",
				expect.any(Error),
			);
			expect(mockMenu.addItem).not.toHaveBeenCalled();

			consoleSpy.mockRestore();
		});
	});
});
