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

describe("MenuService - Cleanup", () => {
	let service: MenuService;
	let mockOnRunInference: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockOnRunInference = vi.fn();
		service = new MenuService(mockOnRunInference);
	});

	afterEach(() => {
		vi.resetAllMocks();
		service.cleanup();
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
