import { describe, it, expect, vi, beforeEach } from "vitest";
import { InferenceService } from "../../src/services/inference-service.ts";
import { createMockApp } from "../mocks/obsidian-extended.ts";

// Mock Obsidian modules
vi.mock("obsidian", () => ({
	Notice: vi.fn(),
}));

// Mock providers
vi.mock("../../src/llm/providers/providers.ts", () => ({
	providers: {
		openai: {
			completion: vi.fn(),
		},
		openrouter: {
			completion: vi.fn(),
		},
		ollama: {
			completion: vi.fn(),
		},
		lmstudio: {
			completion: vi.fn(),
		},
	},
}));

describe("InferenceService", () => {
	let service: InferenceService;
	let mockApp: ReturnType<typeof createMockApp>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockApp = createMockApp();
		const mockGetSettings = vi.fn();
		const mockShowLoadingStatus = vi.fn();
		const mockHideLoadingStatus = vi.fn();
		service = new InferenceService(
			mockApp as any,
			mockGetSettings,
			mockShowLoadingStatus,
			mockHideLoadingStatus,
		);
	});

	it("should initialize InferenceService", () => {
		expect(service).toBeInstanceOf(InferenceService);
	});
});
