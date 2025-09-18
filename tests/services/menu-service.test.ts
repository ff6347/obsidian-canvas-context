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

describe("MenuService", () => {
	let service: MenuService;
	let mockOnRunInference: ReturnType<typeof vi.fn>;
	let mockCanvasView: any;
	let mockCanvas: any;
	let mockMenu: any;

	// Import mocked modules
	let setIcon: any;
	let Notice: any;
	let isSelectionData: any;

	beforeEach(async () => {
		vi.clearAllMocks();

		// Import mocked modules
		({ setIcon } = await import("obsidian"));
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
			expect(mockItem.setTitle).toHaveBeenCalledWith("Canvas Context: Run Inference");
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

			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

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

			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			service.buildSelectionMenu(mockMenu, mockCanvasView);

			expect(consoleSpy).toHaveBeenCalledWith(
				"Error in buildSelectionMenu:",
				expect.any(Error),
			);
			expect(mockMenu.addItem).not.toHaveBeenCalled();

			consoleSpy.mockRestore();
		});
	});

	describe("setupCanvasMenuObservers", () => {
		let mockGetCanvasLeaves: ReturnType<typeof vi.fn>;
		let mockOnActiveLeafChange: ReturnType<typeof vi.fn>;
		let mockLeaf: any;

		beforeEach(() => {
			mockLeaf = {
				view: mockCanvasView,
			};
			mockGetCanvasLeaves = vi.fn().mockReturnValue([mockLeaf]);
			mockOnActiveLeafChange = vi.fn();
		});

		it("should set up observers for existing canvas leaves", () => {
			const setupSpy = vi.spyOn(service, "setupObserverForCanvas");

			service.setupCanvasMenuObservers(mockGetCanvasLeaves, mockOnActiveLeafChange);

			expect(mockGetCanvasLeaves).toHaveBeenCalled();
			expect(setupSpy).toHaveBeenCalledWith(mockLeaf);
		});

		it("should register callback for new canvas views", () => {
			service.setupCanvasMenuObservers(mockGetCanvasLeaves, mockOnActiveLeafChange);

			expect(mockOnActiveLeafChange).toHaveBeenCalledWith(expect.any(Function));
		});

		it("should handle new canvas leaf creation", () => {
			let changeCallback: any;
			mockOnActiveLeafChange.mockImplementation((callback) => {
				changeCallback = callback;
			});

			const setupSpy = vi.spyOn(service, "setupObserverForCanvas");

			service.setupCanvasMenuObservers(mockGetCanvasLeaves, mockOnActiveLeafChange);

			// Simulate new canvas leaf
			const newCanvasLeaf = {
				view: { getViewType: () => "canvas" },
			};

			changeCallback(newCanvasLeaf);

			// Should call setTimeout and eventually setupObserverForCanvas
			expect(vi.mocked(setTimeout)).toHaveBeenCalledWith(
				expect.any(Function),
				100,
			);
		});

		it("should ignore non-canvas leaves", () => {
			let changeCallback: any;
			mockOnActiveLeafChange.mockImplementation((callback) => {
				changeCallback = callback;
			});

			service.setupCanvasMenuObservers(mockGetCanvasLeaves, mockOnActiveLeafChange);

			// Clear any setTimeout calls from initial setup
			vi.mocked(setTimeout).mockClear();

			// Simulate non-canvas leaf
			const nonCanvasLeaf = {
				view: { getViewType: () => "markdown" },
			};

			changeCallback(nonCanvasLeaf);

			expect(vi.mocked(setTimeout)).not.toHaveBeenCalled();
		});

		it("should handle null leaf gracefully", () => {
			let changeCallback: any;
			mockOnActiveLeafChange.mockImplementation((callback) => {
				changeCallback = callback;
			});

			service.setupCanvasMenuObservers(mockGetCanvasLeaves, mockOnActiveLeafChange);

			// Clear any setTimeout calls from initial setup
			vi.mocked(setTimeout).mockClear();

			changeCallback(null);

			expect(vi.mocked(setTimeout)).not.toHaveBeenCalled();
		});
	});

	describe("setupObserverForCanvas", () => {
		let mockMutationObserver: any;
		let mockObserver: any;

		beforeEach(() => {
			mockObserver = {
				observe: vi.fn(),
				disconnect: vi.fn(),
			};
			mockMutationObserver = vi.fn().mockImplementation(() => mockObserver);
			vi.mocked(MutationObserver).mockImplementation(mockMutationObserver);
		});

		it("should return early if canvas is missing", () => {
			const invalidLeaf = { view: null };

			service.setupObserverForCanvas(invalidLeaf as any);

			expect(MutationObserver).not.toHaveBeenCalled();
		});

		it("should return early if menu is missing", () => {
			const leafWithoutMenu = {
				view: {
					canvas: {},
				},
			};

			service.setupObserverForCanvas(leafWithoutMenu as any);

			expect(MutationObserver).not.toHaveBeenCalled();
		});

		it("should return early if observer already setup", () => {
			mockCanvas.menu._observerSetup = true;
			const leaf = { view: mockCanvasView };

			service.setupObserverForCanvas(leaf as any);

			expect(MutationObserver).not.toHaveBeenCalled();
		});

		it("should set up mutation observer when menu element is available", () => {
			const mockMenuEl = { appendChild: vi.fn() };
			mockCanvas.menu.menuEl = mockMenuEl;
			mockCanvas.menu._observerSetup = false;

			const leaf = { view: mockCanvasView };

			service.setupObserverForCanvas(leaf as any);

			expect(mockCanvas.menu._observerSetup).toBe(true);
			expect(MutationObserver).toHaveBeenCalled();
			expect(mockObserver.observe).toHaveBeenCalledWith(mockMenuEl, {
				childList: true,
				subtree: false,
			});
		});

		it("should wait for menu element if not immediately available", () => {
			mockCanvas.menu.menuEl = null;
			mockCanvas.menu._observerSetup = false;

			const leaf = { view: mockCanvasView };

			service.setupObserverForCanvas(leaf as any);

			expect(mockCanvas.menu._observerSetup).toBe(true);
			expect(vi.mocked(setTimeout)).toHaveBeenCalledWith(
				expect.any(Function),
				100,
			);
		});

		it("should call addButtonToCanvasMenu on menu mutations", () => {
			const mockMenuEl = {
				appendChild: vi.fn(),
				querySelector: vi.fn(),
			};
			mockCanvas.menu.menuEl = mockMenuEl;
			mockCanvas.menu._observerSetup = false;

			const addButtonSpy = vi.spyOn(service, "addButtonToCanvasMenu").mockImplementation(() => {});

			const leaf = { view: mockCanvasView };
			service.setupObserverForCanvas(leaf as any);

			// Simulate mutation observer callback
			const mutationCallback = mockMutationObserver.mock.calls[0][0];
			const mockMutations = [
				{
					type: "childList",
					target: mockMenuEl,
				},
			];

			mutationCallback(mockMutations);

			expect(addButtonSpy).toHaveBeenCalledWith(mockCanvasView);
		});

		it("should ignore non-childList mutations", () => {
			const mockMenuEl = { appendChild: vi.fn() };
			mockCanvas.menu.menuEl = mockMenuEl;
			mockCanvas.menu._observerSetup = false;

			const addButtonSpy = vi.spyOn(service, "addButtonToCanvasMenu");

			const leaf = { view: mockCanvasView };
			service.setupObserverForCanvas(leaf as any);

			// Simulate mutation observer callback with wrong type
			const mutationCallback = mockMutationObserver.mock.calls[0][0];
			const mockMutations = [
				{
					type: "attributes",
					target: mockMenuEl,
				},
			];

			mutationCallback(mockMutations);

			expect(addButtonSpy).not.toHaveBeenCalled();
		});

		it("should ignore mutations on wrong target", () => {
			const mockMenuEl = { appendChild: vi.fn() };
			const wrongTarget = { appendChild: vi.fn() };
			mockCanvas.menu.menuEl = mockMenuEl;
			mockCanvas.menu._observerSetup = false;

			const addButtonSpy = vi.spyOn(service, "addButtonToCanvasMenu");

			const leaf = { view: mockCanvasView };
			service.setupObserverForCanvas(leaf as any);

			// Simulate mutation observer callback with wrong target
			const mutationCallback = mockMutationObserver.mock.calls[0][0];
			const mockMutations = [
				{
					type: "childList",
					target: wrongTarget,
				},
			];

			mutationCallback(mockMutations);

			expect(addButtonSpy).not.toHaveBeenCalled();
		});
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
			expect(mockButton.className).toBe("clickable-icon canvas-context-inference-btn");
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
			mockButton.addEventListener.mockImplementation((event, handler) => {
				if (event === "click") {
					clickHandler = handler;
				}
			});

			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

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

			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			service.addButtonToCanvasMenu(mockCanvasView);

			expect(consoleSpy).toHaveBeenCalledWith(
				"Error adding button to canvas menu:",
				expect.any(Error),
			);

			consoleSpy.mockRestore();
		});
	});

	describe("cleanup", () => {
		it("should disconnect all observers", () => {
			const mockObserver1 = { disconnect: vi.fn() };
			const mockObserver2 = { disconnect: vi.fn() };

			// Manually add observers to test cleanup
			(service as any).observers = [mockObserver1, mockObserver2];

			service.cleanup();

			expect(mockObserver1.disconnect).toHaveBeenCalled();
			expect(mockObserver2.disconnect).toHaveBeenCalled();
			expect((service as any).observers).toEqual([]);
		});

		it("should handle empty observers array", () => {
			expect(() => service.cleanup()).not.toThrow();
		});
	});
});