import { describe, it, expect, vi, beforeEach } from "vitest";
import { ModelValidationService } from "../../src/services/model-validation-service.ts";

// Mock Obsidian modules
vi.mock("obsidian", () => ({
	Notice: vi.fn(),
	ButtonComponent: vi.fn(),
}));

// Mock providers
vi.mock("../../src/llm/providers/providers.ts", () => ({
	providers: {
		openai: {
			listModels: vi.fn(),
		},
		openrouter: {
			listModels: vi.fn(),
		},
		ollama: {
			listModels: vi.fn(),
		},
		lmstudio: {
			listModels: vi.fn(),
		},
	},
}));

describe("ModelValidationService", () => {
	let service: ModelValidationService;

	beforeEach(() => {
		vi.clearAllMocks();
		service = new ModelValidationService(() => "test");
	});

	describe("constructor", () => {
		it("should initialize ModelValidationService", () => {
			expect(service).toBeInstanceOf(ModelValidationService);
		});
	});
});
