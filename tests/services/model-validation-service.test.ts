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
	let mockNotificationAdapter: {
		showError: ReturnType<typeof vi.fn>;
		showSuccess: ReturnType<typeof vi.fn>;
		show: ReturnType<typeof vi.fn>;
		showInfo: ReturnType<typeof vi.fn>;
		showLoading: ReturnType<typeof vi.fn>;
		hideLoading: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockNotificationAdapter = {
			showError: vi.fn(),
			showSuccess: vi.fn(),
			show: vi.fn(),
			showInfo: vi.fn(),
			showLoading: vi.fn(),
			hideLoading: vi.fn(),
		};
		service = new ModelValidationService(() => "test", mockNotificationAdapter);
	});

	describe("constructor", () => {
		it("should initialize ModelValidationService", () => {
			expect(service).toBeInstanceOf(ModelValidationService);
		});
	});
});
