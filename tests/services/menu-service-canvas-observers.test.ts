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

describe("MenuService - Canvas Observers", () => {
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
			const _setupSpy = vi.spyOn(service, "setupObserverForCanvas");

			service.setupCanvasMenuObservers(
				mockGetCanvasLeaves,
				mockOnActiveLeafChange,
			);

			expect(mockGetCanvasLeaves).toHaveBeenCalled();
			expect(_setupSpy).toHaveBeenCalledWith(mockLeaf);
		});

		it("should register callback for new canvas views", () => {
			service.setupCanvasMenuObservers(
				mockGetCanvasLeaves,
				mockOnActiveLeafChange,
			);

			expect(mockOnActiveLeafChange).toHaveBeenCalledWith(expect.any(Function));
		});

		it("should handle new canvas leaf creation", () => {
			let changeCallback: any;
			mockOnActiveLeafChange.mockImplementation((callback) => {
				changeCallback = callback;
			});

			service.setupCanvasMenuObservers(
				mockGetCanvasLeaves,
				mockOnActiveLeafChange,
			);

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

			service.setupCanvasMenuObservers(
				mockGetCanvasLeaves,
				mockOnActiveLeafChange,
			);

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

			service.setupCanvasMenuObservers(
				mockGetCanvasLeaves,
				mockOnActiveLeafChange,
			);

			// Clear any setTimeout calls from initial setup
			vi.mocked(setTimeout).mockClear();

			changeCallback(null);

			expect(vi.mocked(setTimeout)).not.toHaveBeenCalled();
		});
	});
});
