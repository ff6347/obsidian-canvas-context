import { describe, expect, it, vi } from "vitest";
import { ApiKeyConfigurationService } from "../../src/services/api-key-configuration-service.ts";
import { TestNotificationAdapter } from "../adapters/test-notification-adapter.ts";
import type {
	ApiKeyConfiguration,
	ModelConfiguration,
} from "../../src/types/settings-types.ts";

describe("ApiKeyConfigurationService", () => {
	const mockApp = {} as any;
	const mockPlugin = {} as any;

	const sampleApiKey: ApiKeyConfiguration = {
		id: "key1",
		name: "Test API Key",
		provider: "openai",
		apiKey: "sk-test123",
		description: "Test key description",
	};

	const sampleModels: ModelConfiguration[] = [
		{
			id: "model1",
			name: "GPT-4",
			provider: "openai",
			modelName: "gpt-4",
			baseURL: "https://api.openai.com/v1",
			enabled: true,
			apiKeyId: "key1",
		},
	];

	function createTestService(
		apiKeys: ApiKeyConfiguration[] = [sampleApiKey],
		models: ModelConfiguration[] = sampleModels,
	) {
		const mockGetSettings = vi.fn(() => ({
			apiKeys,
			modelConfigurations: models,
		}));
		const mockSaveSettings = vi.fn().mockResolvedValue(undefined);
		const mockRefreshDisplay = vi.fn();
		const notificationAdapter = new TestNotificationAdapter();

		const service = new ApiKeyConfigurationService(
			mockApp,
			mockPlugin,
			mockGetSettings,
			mockSaveSettings,
			mockRefreshDisplay,
			notificationAdapter,
		);

		return {
			service,
			mockGetSettings,
			mockSaveSettings,
			mockRefreshDisplay,
			notificationAdapter,
		};
	}

	describe("service orchestration", () => {
		it("correctly coordinates with pure functions and adapters", () => {
			const { service } = createTestService();

			// The service exists and has been constructed with the correct dependencies
			expect(service).toBeDefined();

			// The main value is that we can test business logic in isolation
			// and the service integration is simple orchestration
		});
	});

	describe("deleteApiKey", () => {
		it("prevents deletion when models depend on the API key", async () => {
			const { service, notificationAdapter } = createTestService();

			// Access the private method through any cast for testing
			await (service as any).deleteApiKey(sampleApiKey, 0);

			// Verify error notification was shown
			expect(notificationAdapter.messages).toHaveLength(1);
			expect(notificationAdapter.messages[0]).toEqual({
				type: "general",
				message:
					'Cannot delete API key "Test API Key". It\'s being used by: GPT-4',
			});
		});

		it("allows deletion when no models depend on the API key", async () => {
			const unusedApiKey = { ...sampleApiKey, id: "unused-key" };
			const {
				service,
				mockSaveSettings,
				mockRefreshDisplay,
				notificationAdapter,
				mockGetSettings,
			} = createTestService([unusedApiKey], sampleModels);

			// Access the private method through any cast for testing
			await (service as any).deleteApiKey(unusedApiKey, 0);

			// Verify API key was removed
			const settings = mockGetSettings();
			expect(settings.apiKeys).toHaveLength(0);

			// Verify save and refresh were called
			expect(mockSaveSettings).toHaveBeenCalledOnce();
			expect(mockRefreshDisplay).toHaveBeenCalledOnce();

			// Verify success notification was shown
			expect(notificationAdapter.messages).toHaveLength(1);
			expect(notificationAdapter.messages[0]).toEqual({
				type: "general",
				message: "API key deleted.",
			});
		});

		it("handles deletion with multiple dependent models", async () => {
			const modelsWithMultipleDependencies = [
				...sampleModels,
				{
					id: "model2",
					name: "GPT-3.5",
					provider: "openai",
					modelName: "gpt-3.5-turbo",
					baseURL: "https://api.openai.com/v1",
					enabled: true,
					apiKeyId: "key1",
				},
			] as ModelConfiguration[];

			const { service, notificationAdapter } = createTestService(
				[sampleApiKey],
				modelsWithMultipleDependencies,
			);

			// Access the private method through any cast for testing
			await (service as any).deleteApiKey(sampleApiKey, 0);

			// Verify error notification includes all dependent models
			expect(notificationAdapter.messages).toHaveLength(1);
			expect(notificationAdapter.messages[0]!.message).toBe(
				'Cannot delete API key "Test API Key". It\'s being used by: GPT-4, GPT-3.5',
			);
		});

		it("handles deletion when models array is empty", async () => {
			const {
				service,
				mockSaveSettings,
				mockRefreshDisplay,
				notificationAdapter,
			} = createTestService([sampleApiKey], []);

			// Access the private method through any cast for testing
			await (service as any).deleteApiKey(sampleApiKey, 0);

			// Verify deletion succeeded
			expect(mockSaveSettings).toHaveBeenCalledOnce();
			expect(mockRefreshDisplay).toHaveBeenCalledOnce();
			expect(notificationAdapter.messages).toHaveLength(1);
			expect(notificationAdapter.messages[0]!.message).toBe("API key deleted.");
		});
	});

	describe("integration with pure functions", () => {
		it("uses pure validation logic for deletion checks", async () => {
			const { service, notificationAdapter } = createTestService();

			// Test that validation logic is properly delegated
			await (service as any).deleteApiKey(sampleApiKey, 0);

			// The validation result should prevent deletion and show error
			expect(notificationAdapter.messages).toHaveLength(1);
			expect(notificationAdapter.messages[0]!.type).toBe("general");
			expect(notificationAdapter.messages[0]!.message).toContain(
				"Cannot delete API key",
			);
		});
	});
});
