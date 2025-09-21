import { describe, it, expect, vi, beforeEach } from "vitest";
import { MenuService } from "../../src/services/menu-service.ts";

// Mock Obsidian classes
vi.mock("obsidian", () => ({
	Plugin: vi.fn(),
	PluginSettingTab: vi.fn(),
	Notice: vi.fn(),
	Setting: vi.fn(),
	ButtonComponent: vi.fn(),
	Modal: vi.fn(),
	TextComponent: vi.fn(),
	DropdownComponent: vi.fn(),
}));

describe("MenuService", () => {
	let service: MenuService;
	let mockOnRunInference: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockOnRunInference = vi.fn();
		service = new MenuService(mockOnRunInference);
	});

	it("should initialize with callback function", () => {
		expect(service).toBeInstanceOf(MenuService);
		expect((service as any).onRunInference).toBe(mockOnRunInference);
	});
});