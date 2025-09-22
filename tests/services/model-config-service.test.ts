import { describe, it, expect, vi, beforeEach } from "vitest";
import { ModelConfigService } from "../../src/services/model-config-service.ts";

// Mock Obsidian modules
vi.mock("obsidian", () => ({
	Notice: vi.fn(),
}));

describe("ModelConfigService", () => {
	let service: ModelConfigService;
	let mockSaveData: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSaveData = vi.fn();
		service = new ModelConfigService(
			mockSaveData,
			() => Promise.resolve(),
			() => "test",
		);
	});

	it("should initialize ModelConfigService", () => {
		expect(service).toBeInstanceOf(ModelConfigService);
	});
});
