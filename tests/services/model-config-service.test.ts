import { describe, it, expect, vi, beforeEach } from "vitest";
import { ModelConfigService } from "../../src/services/model-config-service.ts";

// Mock Obsidian modules
vi.mock("obsidian", () => ({
	Notice: vi.fn(),
}));

describe("ModelConfigService", () => {
	let service: ModelConfigService;
	let mockSaveData: ReturnType<typeof vi.fn>;
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
		mockSaveData = vi.fn();
		mockNotificationAdapter = {
			showError: vi.fn(),
			showSuccess: vi.fn(),
			show: vi.fn(),
			showInfo: vi.fn(),
			showLoading: vi.fn(),
			hideLoading: vi.fn(),
		};
		service = new ModelConfigService(
			mockSaveData,
			() => Promise.resolve(),
			() => "test",
			mockNotificationAdapter,
		);
	});

	it("should initialize ModelConfigService", () => {
		expect(service).toBeInstanceOf(ModelConfigService);
	});
});
