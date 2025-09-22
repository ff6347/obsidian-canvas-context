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

describe("MenuService - Observers", () => {
	let service: MenuService;
	let mockOnRunInference: ReturnType<typeof vi.fn>;
	let mockCanvasView: any;
	let mockCanvas: any;

	beforeEach(() => {
		vi.clearAllMocks();

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

			const addButtonSpy = vi
				.spyOn(service, "addButtonToCanvasMenu")
				.mockImplementation(
					/* eslint-disable-next-line no-empty-function */ () => {},
				);

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
});
