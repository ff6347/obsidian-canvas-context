import { describe, it, expect, vi, beforeEach } from "vitest";
import { ModelFormService } from "../../src/services/model-form-service.ts";

// Mock Obsidian modules
vi.mock("obsidian", () => ({
	ButtonComponent: vi.fn(),
	Setting: vi.fn(),
}));

// Mock providers module
vi.mock("../../src/llm/providers/providers.ts", () => ({
	getProviderDocs: vi.fn(),
}));

// Mock settings utils
vi.mock("../../src/lib/settings-utils.ts", () => ({
	computeDisplayName: vi.fn(),
}));

describe("ModelFormService", () => {
	let service: ModelFormService;
	let mockApiKeys: any[];
	let mockOnConfigChange: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockApiKeys = [];
		mockOnConfigChange = vi.fn();
		service = new ModelFormService(mockApiKeys, mockOnConfigChange);
	});

	it("should initialize with api keys and onChange callback", () => {
		expect(service).toBeInstanceOf(ModelFormService);
	});
});
